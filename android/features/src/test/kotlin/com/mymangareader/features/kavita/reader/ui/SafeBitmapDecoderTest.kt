package com.mymangareader.features.kavita.reader.ui

import android.graphics.Bitmap
import android.graphics.Color
import androidx.test.core.app.ApplicationProvider
import coil.decode.ImageSource
import kotlinx.coroutines.test.runTest
import okio.buffer
import okio.source
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.ByteArrayOutputStream

@RunWith(RobolectricTestRunner::class)
class SafeBitmapDecoderTest {
    private val context = ApplicationProvider.getApplicationContext<android.content.Context>()

    private fun pngBytes(
        width: Int,
        height: Int,
    ): ByteArray {
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        android.graphics.Canvas(bitmap).drawColor(Color.WHITE)
        val output = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)
        return output.toByteArray()
    }

    private fun imageSource(bytes: ByteArray): ImageSource = ImageSource(bytes.inputStream().source().buffer(), context)

    @Test
    fun `decode returns a bitmap for an image under the tile height`() =
        runTest {
            val decoder = SafeBitmapDecoder(imageSource(pngBytes(10, 10)), cacheKey = "small")

            val result = decoder.decode()

            assertNotNull(result)
        }

    @Test
    fun `decode returns a stitched bitmap for an image taller than the tile height`() =
        runTest {
            val decoder = SafeBitmapDecoder(imageSource(pngBytes(10, 5000)), cacheKey = "tall")

            val result = decoder.decode()

            assertNotNull(result)
            val bitmap = (result!!.drawable as android.graphics.drawable.BitmapDrawable).bitmap
            assertEquals(10, bitmap.width)
            assertEquals(5000, bitmap.height)
        }

    @Test
    fun `a PNG whose full size exceeds the output budget comes back scaled down to fit it`() =
        runTest {
            // 2000x2100 ARGB_8888 = ~16.8MB: heavy and taller than a tile, over the 4MB test budget.
            val decoder = SafeBitmapDecoder(imageSource(pngBytes(2000, 2100)), cacheKey = "huge-png", maxOutputBytes = 4L * 1024 * 1024)

            val result = decoder.decode()

            assertNotNull(result)
            val bitmap = (result!!.drawable as android.graphics.drawable.BitmapDrawable).bitmap
            assertTrue(bitmap.width < 2000 && bitmap.height < 2100)
            assertTrue(bitmap.byteCount <= 4L * 1024 * 1024)
            assertEquals(2000.0 / 2100.0, bitmap.width.toDouble() / bitmap.height, 0.01) // aspect ratio preserved
            assertTrue(result.isSampled)
        }

    @Test
    fun `a JPEG over the output budget is also kept within it by the tiled path`() =
        runTest {
            val bitmap = Bitmap.createBitmap(2000, 2100, Bitmap.Config.ARGB_8888)
            android.graphics.Canvas(bitmap).drawColor(Color.WHITE)
            val out = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, 80, out)
            val decoder = SafeBitmapDecoder(imageSource(out.toByteArray()), cacheKey = "huge-jpeg", maxOutputBytes = 4L * 1024 * 1024)

            val result = decoder.decode()

            assertNotNull(result)
            val decoded = (result!!.drawable as android.graphics.drawable.BitmapDrawable).bitmap
            assertTrue(decoded.byteCount <= 4L * 1024 * 1024)
            assertEquals(2000.0 / 2100.0, decoded.width.toDouble() / decoded.height, 0.01)
        }

    @Test
    fun `factory creates a SafeBitmapDecoder`() {
        val factory = SafeBitmapDecoder.Factory()

        assertNotNull(factory)
    }
}
