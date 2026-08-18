package com.mymangareader.features.kavita.reader.ui

import android.graphics.Bitmap
import android.graphics.Color
import androidx.test.core.app.ApplicationProvider
import coil.decode.ImageSource
import java.io.ByteArrayOutputStream
import kotlinx.coroutines.test.runTest
import okio.buffer
import okio.source
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
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
    fun `decode returns a bitmap for an image under the tile height`() = runTest {
        val decoder = SafeBitmapDecoder(imageSource(pngBytes(10, 10)), cacheKey = "small")

        val result = decoder.decode()

        assertNotNull(result)
    }

    @Test
    fun `decode returns a stitched bitmap for an image taller than the tile height`() = runTest {
        val decoder = SafeBitmapDecoder(imageSource(pngBytes(10, 5000)), cacheKey = "tall")

        val result = decoder.decode()

        assertNotNull(result)
        val bitmap = (result!!.drawable as android.graphics.drawable.BitmapDrawable).bitmap
        assertEquals(10, bitmap.width)
        assertEquals(5000, bitmap.height)
    }

    @Test
    fun `factory creates a SafeBitmapDecoder`() {
        val factory = SafeBitmapDecoder.Factory()

        assertNotNull(factory)
    }
}
