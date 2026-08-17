package com.mymangareader.features.kavita.reader.ui

import android.graphics.Bitmap
import android.graphics.Color
import androidx.test.core.app.ApplicationProvider
import coil.decode.DecodeResult
import coil.decode.ImageSource
import coil.size.Size
import java.io.ByteArrayOutputStream
import kotlinx.coroutines.runBlocking
import okio.buffer
import okio.source
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class SafeBitmapDecoderTest {

    private val context = ApplicationProvider.getApplicationContext<android.content.Context>()

    private fun pngBytes(width: Int, height: Int): ByteArray {
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        android.graphics.Canvas(bitmap).drawColor(Color.WHITE)
        val output = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)
        return output.toByteArray()
    }

    private fun imageSource(bytes: ByteArray): ImageSource =
        ImageSource(bytes.inputStream().source().buffer(), context)

    @Test
    fun `calculateInSampleSize returns 1 for images already under the safe dimension`() {
        val decoder = SafeBitmapDecoder(imageSource(pngBytes(10, 10)))

        assertEquals(1, decoder.calculateInSampleSize(800, 1200))
    }

    @Test
    fun `calculateInSampleSize downsamples tall images to stay under the safe dimension`() {
        val decoder = SafeBitmapDecoder(imageSource(pngBytes(10, 10)))

        val sampleSize = decoder.calculateInSampleSize(780, 9545)

        assertTrue(9545 / sampleSize <= 4096)
    }

    @Test
    fun `calculateInSampleSize only uses powers of two`() {
        val decoder = SafeBitmapDecoder(imageSource(pngBytes(10, 10)))

        val sampleSize = decoder.calculateInSampleSize(780, 5600)

        assertEquals(0, sampleSize and (sampleSize - 1))
    }

    @Test
    fun `decode produces a bitmap for a small image without downsampling`() = runBlocking {
        val decoder = SafeBitmapDecoder(imageSource(pngBytes(100, 100)))

        val result: DecodeResult? = decoder.decode()

        assertNotNull(result)
        assertEquals(false, result?.isSampled)
    }

    @Test
    fun `decode downsamples a tall image instead of decoding it at full resolution`() = runBlocking {
        val decoder = SafeBitmapDecoder(imageSource(pngBytes(100, 5000)))

        val result: DecodeResult? = decoder.decode()

        assertNotNull(result)
        assertEquals(true, result?.isSampled)
        val bitmap = (result?.drawable as android.graphics.drawable.BitmapDrawable).bitmap
        assertTrue(bitmap.height < 5000)
    }

    @Test
    fun `factory creates a SafeBitmapDecoder`() {
        val factory = SafeBitmapDecoder.Factory()
        assertNotNull(factory)
    }
}
