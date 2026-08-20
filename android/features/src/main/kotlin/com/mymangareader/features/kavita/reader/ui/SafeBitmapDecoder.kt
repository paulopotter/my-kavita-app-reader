package com.mymangareader.features.kavita.reader.ui

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BitmapRegionDecoder
import android.graphics.Canvas
import android.graphics.Rect
import coil.ImageLoader
import coil.decode.DecodeResult
import coil.decode.Decoder
import coil.decode.ImageSource
import coil.fetch.SourceResult
import coil.request.Options
import kotlinx.coroutines.runInterruptible
import org.aomedia.avif.android.AvifDecoder
import java.nio.ByteBuffer

// Some devices (confirmed on a real device: Qualcomm SoC, SM8550) fail to decode very tall images
// through the platform's normal BitmapFactory/ImageDecoder decode path — the OS routes AVIF (and
// only AVIF: it's literally encoded with the AV1 video codec) through MediaCodec's hardware video
// pipeline, and this SoC's AV1 decoder (c2.qti.av1.decoder) rejects tall images with BAD_VALUE
// while CONFIGURING regardless of any client-side downsampling requested — ImageDecoder.setTargetSize
// does not help because the codec is configured with the file's raw dimensions before any scaling
// happens. This is not a routing bug to work around; there is no software-only AVIF decode path in
// the public Android SDK at all.
//
// The failing page in this bug turned out to be an AVIF file served with a ".jpg" extension and an
// "image/jpeg" Content-Type by the Kavita server (confirmed by reading the raw file: magic bytes
// "ftypavif") — Coil's SourceResult.mimeType (sniffed from the URL/Content-Type) is therefore not
// trustworthy for choosing a decode strategy; only BitmapFactory.Options.outMimeType, read from the
// actual bytes after decodeByteArray, reflects the real format.
//
// Two decode strategies, chosen by real format:
// - BitmapRegionDecoder tiling (JPEG/PNG/WebP): platform-guaranteed support, decodes
//   TILE_HEIGHT_PX-tall horizontal strips one at a time and stitches them via Canvas so the single
//   huge allocation that appears to trigger the MediaCodec routing never happens.
// - org.aomedia.avif.android:avif (AVIF): the AOM-maintained libavif+dav1d JNI binding, a pure
//   software AV1/AVIF decoder that never touches MediaCodec. Bounds come from BitmapFactory bounds
//   (outMimeType sniffs the real format); decode() writes into a caller-provided Bitmap sized at the
//   image's real dimensions — no downsampling — since the MediaCodec bug that TILE_HEIGHT_PX exists
//   to avoid never applies to this path.
private const val TILE_HEIGHT_PX = 2048

/**
 * Coil decoder that avoids asking the platform to decode very tall images in one shot: tiles via
 * [BitmapRegionDecoder] for JPEG/PNG/WebP (see [TILE_HEIGHT_PX] for why that matters on some
 * devices), or decodes via [AvifDecoder] (pure software, no MediaCodec) for AVIF.
 */
class SafeBitmapDecoder(
    private val source: ImageSource,
    private val cacheKey: String?,
) : Decoder {

    override suspend fun decode(): DecodeResult? {
        // PagePreloader and the real on-screen SubcomposeAsyncImage can both request the same
        // page URL around the same time (the preload window includes the page right before it
        // becomes visible) — Coil's plain execute()/enqueue() has no in-flight dedup, so this runs
        // as two independent fetch+decode pipelines. On-device logs showed their two concurrent
        // reads racing over the same underlying disk-cache entry: one decode finishes and closes
        // its source, the other's read then throws IllegalStateException("closed"), and that
        // failed attempt is sometimes what the UI ends up observing (the retry button showing for
        // a page that actually decoded fine moments earlier on the other path). Serializing
        // decodes per disk-cache key removes the race — the second caller just waits and then
        // hits Coil's memory cache instead of reading a source that's mid-close.
        return PageDecodeCoordinator.withUrlLock(cacheKey ?: return decodeNow()) { decodeNow() }
    }

    private suspend fun decodeNow(): DecodeResult? = runInterruptible {
        val bytes = source.source().use { it.readByteArray() }
        ReaderDebugFlags.d("CoilDiagnostic") { "decodeNow bytesRead=${bytes.size} cacheKey=$cacheKey" }

        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        val originalWidth = bounds.outWidth
        val originalHeight = bounds.outHeight
        ReaderDebugFlags.d("CoilDiagnostic") {
            "decodeNow bounds=${originalWidth}x$originalHeight mimeType=${bounds.outMimeType} cacheKey=$cacheKey"
        }
        if (originalWidth <= 0 || originalHeight <= 0) {
            android.util.Log.e("CoilDiagnostic", "decodeNow BAD BOUNDS cacheKey=$cacheKey")
            return@runInterruptible null
        }

        if (originalHeight <= TILE_HEIGHT_PX) {
            ReaderDebugFlags.d("CoilDiagnostic") { "decodeNow SMALL PATH (no tiling needed) cacheKey=$cacheKey" }
            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options())
            if (bitmap == null) {
                android.util.Log.e("CoilDiagnostic", "decodeNow SMALL PATH BITMAP NULL cacheKey=$cacheKey")
                return@runInterruptible null
            }
            ReaderDebugFlags.d("CoilDiagnostic") {
                "decodeNow SMALL PATH SUCCESS bitmap=${bitmap.width}x${bitmap.height} cacheKey=$cacheKey"
            }
            return@runInterruptible DecodeResult(
                drawable = android.graphics.drawable.BitmapDrawable(null, bitmap),
                isSampled = false,
            )
        }

        val realMimeType = bounds.outMimeType
        ReaderDebugFlags.d("CoilDiagnostic") { "decodeNow realMimeType=$realMimeType cacheKey=$cacheKey" }

        if (realMimeType == "image/avif") {
            decodeAvif(bytes, originalWidth, originalHeight)
        } else {
            decodeTiled(bytes, originalWidth, originalHeight)
        }
    }

    // AVIF is encoded with the AV1 video codec, so both BitmapFactory and ImageDecoder always route
    // it through MediaCodec — there is no software-only AVIF path in the public Android SDK, and no
    // downsampling option avoids the codec being configured with the file's raw dimensions first
    // (confirmed: ImageDecoder.setTargetSize reproduced the same BAD_VALUE failure as the untouched
    // path). org.aomedia.avif.android:avif decodes AVIF in pure software (libavif+dav1d JNI) into a
    // Bitmap the caller pre-allocates — here, sized at the image's real dimensions, since this path
    // never triggers the hardware bug that made downsampling necessary elsewhere in this class.
    private fun decodeAvif(bytes: ByteArray, originalWidth: Int, originalHeight: Int): DecodeResult? {
        ReaderDebugFlags.d("CoilDiagnostic") { "decodeAvif START ${originalWidth}x$originalHeight cacheKey=$cacheKey" }
        return try {
            val buffer = ByteBuffer.allocateDirect(bytes.size).apply {
                put(bytes)
                rewind()
            }
            val bitmap = Bitmap.createBitmap(originalWidth, originalHeight, Bitmap.Config.ARGB_8888)
            val success = AvifDecoder.decode(buffer, bytes.size, bitmap)
            if (!success) {
                android.util.Log.e("CoilDiagnostic", "decodeAvif decode() returned false cacheKey=$cacheKey")
                return null
            }
            ReaderDebugFlags.d("CoilDiagnostic") {
                "decodeAvif SUCCESS bitmap=${bitmap.width}x${bitmap.height} cacheKey=$cacheKey"
            }
            DecodeResult(drawable = android.graphics.drawable.BitmapDrawable(null, bitmap), isSampled = false)
        } catch (t: Throwable) {
            android.util.Log.e("CoilDiagnostic", "decodeAvif THREW cacheKey=$cacheKey", t)
            null
        }
    }

    private fun decodeTiled(bytes: ByteArray, originalWidth: Int, originalHeight: Int): DecodeResult? {
        ReaderDebugFlags.d("CoilDiagnostic") {
            "decodeTiled START ${originalWidth}x$originalHeight tileHeight=$TILE_HEIGHT_PX cacheKey=$cacheKey"
        }

        val regionDecoder = try {
            @Suppress("DEPRECATION")
            BitmapRegionDecoder.newInstance(bytes, 0, bytes.size, false)
        } catch (t: Throwable) {
            android.util.Log.e("CoilDiagnostic", "decodeTiled newInstance THREW cacheKey=$cacheKey", t)
            null
        }
        if (regionDecoder == null) {
            android.util.Log.e("CoilDiagnostic", "decodeTiled newInstance NULL cacheKey=$cacheKey")
            return null
        }

        try {
            val output = try {
                Bitmap.createBitmap(originalWidth, originalHeight, Bitmap.Config.ARGB_8888)
            } catch (t: Throwable) {
                android.util.Log.e(
                    "CoilDiagnostic",
                    "decodeTiled output createBitmap THREW ${originalWidth}x$originalHeight cacheKey=$cacheKey",
                    t,
                )
                return null
            }
            val canvas = Canvas(output)

            var top = 0
            var tileIndex = 0
            while (top < originalHeight) {
                val bottom = minOf(top + TILE_HEIGHT_PX, originalHeight)
                val rect = Rect(0, top, originalWidth, bottom)
                ReaderDebugFlags.d("CoilDiagnostic") { "decodeTiled tile=$tileIndex rect=$rect cacheKey=$cacheKey" }
                val tileBitmap = try {
                    regionDecoder.decodeRegion(rect, BitmapFactory.Options())
                } catch (t: Throwable) {
                    android.util.Log.e(
                        "CoilDiagnostic",
                        "decodeTiled tile=$tileIndex decodeRegion THREW rect=$rect cacheKey=$cacheKey",
                        t,
                    )
                    null
                }
                if (tileBitmap == null) {
                    android.util.Log.e(
                        "CoilDiagnostic",
                        "decodeTiled tile=$tileIndex decodeRegion NULL rect=$rect cacheKey=$cacheKey",
                    )
                    return null
                }
                canvas.drawBitmap(tileBitmap, 0f, top.toFloat(), null)
                tileBitmap.recycle()
                ReaderDebugFlags.d("CoilDiagnostic") { "decodeTiled tile=$tileIndex OK rect=$rect cacheKey=$cacheKey" }

                top = bottom
                tileIndex++
            }

            ReaderDebugFlags.d("CoilDiagnostic") {
                "decodeTiled SUCCESS bitmap=${output.width}x${output.height} tiles=$tileIndex cacheKey=$cacheKey"
            }
            return DecodeResult(drawable = android.graphics.drawable.BitmapDrawable(null, output), isSampled = false)
        } finally {
            regionDecoder.recycle()
        }
    }

    class Factory : Decoder.Factory {
        override fun create(result: SourceResult, options: Options, imageLoader: ImageLoader): Decoder {
            ReaderDebugFlags.d("CoilDiagnostic") {
                "SafeBitmapDecoder.Factory.create() cacheKey=${options.diskCacheKey} mimeType=${result.mimeType}"
            }
            return SafeBitmapDecoder(result.source, options.diskCacheKey)
        }
    }
}
