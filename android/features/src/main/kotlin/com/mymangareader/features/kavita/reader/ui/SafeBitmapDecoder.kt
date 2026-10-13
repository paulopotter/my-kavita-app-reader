package com.mymangareader.features.kavita.reader.ui

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BitmapRegionDecoder
import android.graphics.Canvas
import android.graphics.Paint
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

// Final stitched bitmap is capped at this many bytes (ARGB_8888). Android's RecordingCanvas refuses
// to draw a bitmap above ~100MB ("Canvas: trying to draw too large(N bytes) bitmap", a FATAL crash
// on the main thread, not catchable at decode time) — confirmed on-device with 1450x27604 PNG
// webtoon strips (152MB each). Staying well under leaves headroom for several pages in memory.
//
// 48MB, not just "under 100MB": on-device logs with 80MB pages showed `Davey! duration=700-1550ms`
// on the RenderThread and 30-138 skipped frames WHILE SCROLLING with no decode running — each page's
// texture is that big, two or three visible at once exceed the GPU resource cache, and the
// textures get re-uploaded as the list moves. At 48MB a 1500px-wide strip lands at ~1050px wide,
// about the width of a 1080px screen, so there is almost nothing to lose visually.
private const val MAX_OUTPUT_BYTES = 48L * 1024 * 1024

// Decodes above this estimated size (ARGB_8888) are "heavy": a tall PNG strip is decoded in a dozen
// region passes and each pass re-inflates the PNG from the top, so it burns a core for seconds.
// With the preloader's window plus the visible pages, five of these were observed starting within
// 250ms of each other — every core busy, GC thrashing, UI at ~1fps. Heavy decodes now queue on this
// gate (fair, so pages are served in request order) and run at background thread priority so the UI
// and gesture threads keep getting CPU.
private const val HEAVY_DECODE_BYTES = 16L * 1024 * 1024

// Largest full-size PNG decoded in one piece before scaling down (it briefly holds the full-size
// bitmap AND the scaled one). Anything bigger takes the tiled path. Heavy decodes run one at a time,
// so this transient peak never doubles up.
private const val WHOLE_DECODE_MAX_BYTES = 200L * 1024 * 1024

private fun fullBytesOf(
    width: Int,
    height: Int,
): Long = width.toLong() * height * 4

// Shrink factor that keeps the stitched/scaled bitmap within MAX_OUTPUT_BYTES (1f = no shrink).
private fun outputScaleFor(
    width: Int,
    height: Int,
    maxOutputBytes: Long,
): Float {
    val full = fullBytesOf(width, height)
    return if (full <= maxOutputBytes) 1f else Math.sqrt(maxOutputBytes.toDouble() / full).toFloat()
}
private const val MAX_CONCURRENT_HEAVY_DECODES = 1
private val heavyDecodeGate = java.util.concurrent.Semaphore(MAX_CONCURRENT_HEAVY_DECODES, true)

/**
 * Coil decoder that avoids asking the platform to decode very tall images in one shot: tiles via
 * [BitmapRegionDecoder] for JPEG/PNG/WebP (see [TILE_HEIGHT_PX] for why that matters on some
 * devices), or decodes via [AvifDecoder] (pure software, no MediaCodec) for AVIF.
 */
class SafeBitmapDecoder(
    private val source: ImageSource,
    private val cacheKey: String?,
    // Injectable only so tests can exercise the downscale with small images; production always uses
    // the default.
    private val maxOutputBytes: Long = MAX_OUTPUT_BYTES,
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

    private suspend fun decodeNow(): DecodeResult? =
        runInterruptible {
            val bytes = source.source().use { it.readByteArray() }
            ReaderDebugFlags.d("CoilDiagnostic") { "decodeNow bytesRead=${bytes.size} cacheKey=$cacheKey" }

            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
            val originalWidth = bounds.outWidth
            val originalHeight = bounds.outHeight
            // Always-on (Log.i): estimated ARGB_8888 size vs. free Java heap, to catch OOM crashes.
            run {
                val rt = Runtime.getRuntime()
                val estimateMb = originalWidth.toLong() * originalHeight * 4 / (1024 * 1024)
                val freeMb = (rt.maxMemory() - (rt.totalMemory() - rt.freeMemory())) / (1024 * 1024)
                android.util.Log.i(
                    "CoilDiagnostic",
                    "decodeNow SIZE ${originalWidth}x$originalHeight est=${estimateMb}MB " +
                        "fileKb=${bytes.size / 1024} heapFree=${freeMb}MB heapMax=${rt.maxMemory() / (1024 * 1024)}MB " +
                        "mime=${bounds.outMimeType} cacheKey=$cacheKey",
                )
            }
            ReaderDebugFlags.d("CoilDiagnostic") {
                "decodeNow bounds=${originalWidth}x$originalHeight mimeType=${bounds.outMimeType} cacheKey=$cacheKey"
            }
            if (originalWidth <= 0 || originalHeight <= 0) {
                android.util.Log.e("CoilDiagnostic", "decodeNow BAD BOUNDS cacheKey=$cacheKey")
                return@runInterruptible null
            }

            if (originalHeight <= TILE_HEIGHT_PX) {
                ReaderDebugFlags.d("CoilDiagnostic") { "decodeNow SMALL PATH (no tiling needed) cacheKey=$cacheKey" }
                val bitmap =
                    try {
                        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options())
                    } catch (t: Throwable) {
                        android.util.Log.e("CoilDiagnostic", "decodeNow SMALL PATH THREW cacheKey=$cacheKey", t)
                        null
                    }
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

            withHeavyDecodeGate(originalWidth.toLong() * originalHeight * 4) {
                when {
                    realMimeType == "image/avif" -> decodeAvif(bytes, originalWidth, originalHeight)
                    // PNG can't be read by region: each BitmapRegionDecoder pass re-inflates the file
                    // from the top, so a 14-tile strip took 2.6-5.8s on device. One decode + one scale
                    // is a fraction of that. Falls back to the tiled path if it can't allocate.
                    realMimeType == "image/png" && fullBytesOf(originalWidth, originalHeight) <= WHOLE_DECODE_MAX_BYTES ->
                        decodeWholeScaled(bytes, originalWidth, originalHeight) ?: decodeTiled(bytes, originalWidth, originalHeight)
                    else -> decodeTiled(bytes, originalWidth, originalHeight)
                }
            }
        }

    private inline fun <T> withHeavyDecodeGate(
        estimatedBytes: Long,
        block: () -> T,
    ): T {
        if (estimatedBytes < HEAVY_DECODE_BYTES) return block()
        val startedWaiting = System.nanoTime()
        heavyDecodeGate.acquire() // interruptible: a cancelled request leaves the queue
        val previousPriority = android.os.Process.getThreadPriority(android.os.Process.myTid())
        try {
            android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_BACKGROUND)
            android.util.Log.i(
                "CoilDiagnostic",
                "heavy decode start waited=${(System.nanoTime() - startedWaiting) / 1_000_000}ms " +
                    "est=${estimatedBytes / (1024 * 1024)}MB cacheKey=$cacheKey",
            )
            val t0 = System.nanoTime()
            return block().also {
                android.util.Log.i(
                    "CoilDiagnostic",
                    "heavy decode done took=${(System.nanoTime() - t0) / 1_000_000}ms cacheKey=$cacheKey",
                )
            }
        } finally {
            android.os.Process.setThreadPriority(previousPriority)
            heavyDecodeGate.release()
        }
    }

    // AVIF is encoded with the AV1 video codec, so both BitmapFactory and ImageDecoder always route
    // it through MediaCodec — there is no software-only AVIF path in the public Android SDK, and no
    // downsampling option avoids the codec being configured with the file's raw dimensions first
    // (confirmed: ImageDecoder.setTargetSize reproduced the same BAD_VALUE failure as the untouched
    // path). org.aomedia.avif.android:avif decodes AVIF in pure software (libavif+dav1d JNI) into a
    // Bitmap the caller pre-allocates — here, sized at the image's real dimensions, since this path
    // never triggers the hardware bug that made downsampling necessary elsewhere in this class.
    private fun decodeAvif(
        bytes: ByteArray,
        originalWidth: Int,
        originalHeight: Int,
    ): DecodeResult? {
        ReaderDebugFlags.d("CoilDiagnostic") { "decodeAvif START ${originalWidth}x$originalHeight cacheKey=$cacheKey" }
        return try {
            val buffer =
                ByteBuffer.allocateDirect(bytes.size).apply {
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

    private fun decodeWholeScaled(
        bytes: ByteArray,
        originalWidth: Int,
        originalHeight: Int,
    ): DecodeResult? {
        val scale = outputScaleFor(originalWidth, originalHeight, maxOutputBytes)
        val full =
            try {
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options())
            } catch (t: Throwable) {
                android.util.Log.e("CoilDiagnostic", "decodeWholeScaled decode THREW cacheKey=$cacheKey", t)
                null
            } ?: return null
        if (scale >= 1f) {
            return DecodeResult(drawable = android.graphics.drawable.BitmapDrawable(null, full), isSampled = false)
        }
        val outWidth = maxOf(1, Math.round(originalWidth * scale))
        val outHeight = maxOf(1, Math.round(originalHeight * scale))
        return try {
            val scaled = Bitmap.createScaledBitmap(full, outWidth, outHeight, true)
            android.util.Log.i(
                "CoilDiagnostic",
                "decodeWholeScaled ${originalWidth}x$originalHeight -> ${outWidth}x$outHeight cacheKey=$cacheKey",
            )
            DecodeResult(drawable = android.graphics.drawable.BitmapDrawable(null, scaled), isSampled = true)
        } catch (t: Throwable) {
            android.util.Log.e("CoilDiagnostic", "decodeWholeScaled scale THREW cacheKey=$cacheKey", t)
            null
        } finally {
            full.recycle()
        }
    }

    private fun decodeTiled(
        bytes: ByteArray,
        originalWidth: Int,
        originalHeight: Int,
    ): DecodeResult? {
        ReaderDebugFlags.d("CoilDiagnostic") {
            "decodeTiled START ${originalWidth}x$originalHeight tileHeight=$TILE_HEIGHT_PX cacheKey=$cacheKey"
        }

        val regionDecoder =
            try {
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
            val scale = outputScaleFor(originalWidth, originalHeight, maxOutputBytes)
            val outWidth = maxOf(1, Math.round(originalWidth * scale))
            val outHeight = maxOf(1, Math.round(originalHeight * scale))
            if (scale < 1f) {
                android.util.Log.i(
                    "CoilDiagnostic",
                    "decodeTiled DOWNSCALE ${originalWidth}x$originalHeight -> ${outWidth}x$outHeight scale=$scale cacheKey=$cacheKey",
                )
            }
            val output =
                try {
                    Bitmap.createBitmap(outWidth, outHeight, Bitmap.Config.ARGB_8888)
                } catch (t: Throwable) {
                    android.util.Log.e(
                        "CoilDiagnostic",
                        "decodeTiled output createBitmap THREW ${outWidth}x$outHeight cacheKey=$cacheKey",
                        t,
                    )
                    return null
                }
            val canvas = Canvas(output)
            val paint = Paint(Paint.FILTER_BITMAP_FLAG)

            var top = 0
            var tileIndex = 0
            while (top < originalHeight) {
                val bottom = minOf(top + TILE_HEIGHT_PX, originalHeight)
                val rect = Rect(0, top, originalWidth, bottom)
                ReaderDebugFlags.d("CoilDiagnostic") { "decodeTiled tile=$tileIndex rect=$rect cacheKey=$cacheKey" }
                val tileBitmap =
                    try {
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
                // Rounded edges from the same function for adjacent tiles, so no seam/gap appears.
                val dst = Rect(0, Math.round(top * scale), outWidth, Math.round(bottom * scale))
                canvas.drawBitmap(tileBitmap, null, dst, paint)
                tileBitmap.recycle()
                ReaderDebugFlags.d("CoilDiagnostic") { "decodeTiled tile=$tileIndex OK rect=$rect cacheKey=$cacheKey" }

                top = bottom
                tileIndex++
            }

            ReaderDebugFlags.d("CoilDiagnostic") {
                "decodeTiled SUCCESS bitmap=${output.width}x${output.height} tiles=$tileIndex cacheKey=$cacheKey"
            }
            return DecodeResult(drawable = android.graphics.drawable.BitmapDrawable(null, output), isSampled = scale < 1f)
        } finally {
            regionDecoder.recycle()
        }
    }

    class Factory : Decoder.Factory {
        override fun create(
            result: SourceResult,
            options: Options,
            imageLoader: ImageLoader,
        ): Decoder {
            ReaderDebugFlags.d("CoilDiagnostic") {
                "SafeBitmapDecoder.Factory.create() cacheKey=${options.diskCacheKey} mimeType=${result.mimeType}"
            }
            return SafeBitmapDecoder(result.source, options.diskCacheKey)
        }
    }
}
