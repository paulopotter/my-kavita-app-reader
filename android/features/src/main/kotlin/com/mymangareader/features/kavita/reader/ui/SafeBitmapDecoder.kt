package com.mymangareader.features.kavita.reader.ui

import android.graphics.BitmapFactory
import coil.ImageLoader
import coil.decode.DecodeResult
import coil.decode.Decoder
import coil.decode.ImageSource
import coil.fetch.SourceResult
import coil.request.Options
import kotlinx.coroutines.runInterruptible

// Some devices (confirmed on a real device: Qualcomm SoC) fail to decode very tall images
// (observed at height > ~5600px) through the platform's normal BitmapFactory.decodeStream path —
// the OS silently routes the decode through a hardware video codec fallback (logcat showed
// MediaCodec attempting to configure an AV1 decoder with the image's raw pixel dimensions as if
// they were a video frame, then rejecting them with BAD_VALUE). The same WebP file opens fine in
// a browser, which uses a different (libwebp-only) decode path — this is Android's own pipeline
// misbehaving for extreme aspect ratios, not a malformed file. Asking BitmapFactory to decode at
// full resolution is what triggers the broken fallback; requesting an already-downsampled bitmap
// via inSampleSize keeps the image within a size the platform decodes normally.
private const val SAFE_MAX_DIMENSION_PX = 4096

/**
 * Coil decoder that always reads bounds first and downsamples via [BitmapFactory.Options.inSampleSize]
 * before requesting the real decode, instead of asking BitmapFactory to decode the raw image and
 * only resizing afterward. See [SAFE_MAX_DIMENSION_PX] for why this matters on some devices.
 */
class SafeBitmapDecoder(private val source: ImageSource) : Decoder {

    override suspend fun decode(): DecodeResult? = runInterruptible {
        val bytes = source.source().use { it.readByteArray() }

        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        val originalWidth = bounds.outWidth
        val originalHeight = bounds.outHeight
        if (originalWidth <= 0 || originalHeight <= 0) return@runInterruptible null

        val sampleSize = calculateInSampleSize(originalWidth, originalHeight)
        val options = BitmapFactory.Options().apply { inSampleSize = sampleSize }
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options) ?: return@runInterruptible null

        DecodeResult(drawable = android.graphics.drawable.BitmapDrawable(null, bitmap), isSampled = sampleSize > 1)
    }

    internal fun calculateInSampleSize(width: Int, height: Int): Int {
        var sampleSize = 1
        while (width / sampleSize > SAFE_MAX_DIMENSION_PX || height / sampleSize > SAFE_MAX_DIMENSION_PX) {
            sampleSize *= 2
        }
        return sampleSize
    }

    class Factory : Decoder.Factory {
        override fun create(result: SourceResult, options: Options, imageLoader: ImageLoader): Decoder =
            SafeBitmapDecoder(result.source)
    }
}
