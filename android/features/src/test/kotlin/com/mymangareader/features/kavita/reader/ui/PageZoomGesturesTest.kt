package com.mymangareader.features.kavita.reader.ui

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.test.click
import androidx.compose.ui.test.doubleClick
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pinch
import androidx.compose.ui.test.swipeUp
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * The zoom gestures through the real list: a header, then one tall page. The images never load in
 * Robolectric, so the page is its placeholder — touches land away from its centre, where the retry
 * control would otherwise swallow them.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class PageZoomGesturesTest {
    @get:Rule
    val composeRule = createComposeRule()

    private val blocks =
        listOf(
            ChapterBlock(
                chapterId = "c1",
                pageUrls = listOf("https://example.invalid/0.webp", "https://example.invalid/1.webp"),
                pageAspectRatios = listOf(1.5f, 1.5f),
                firstNode = SduNode.Container(children = listOf(SduNode.TextNode(text = "Capítulo 1", fontSizeSp = 20))),
                lastNode = null,
            ),
        )

    private val zoomEvents = mutableListOf<Boolean>()
    private var taps = 0

    private fun show(zoomEnabled: Boolean) {
        composeRule.setContent {
            ReaderPageList(
                blocks = blocks,
                onTap = { taps++ },
                zoomEnabled = zoomEnabled,
                onZoomChanged = { zoomEvents += it },
            )
        }
        composeRule.waitForIdle()
    }

    // A point inside the first page, off its centre.
    private fun androidx.compose.ui.test.TouchInjectionScope.onPage() = Offset(width * 0.15f, height * 0.3f)

    @Test
    fun `double-tap zooms the page and a second double-tap leaves zoom`() {
        show(zoomEnabled = true)

        composeRule.onRoot().performTouchInput { doubleClick(onPage()) }
        composeRule.waitForIdle()
        assertEquals(listOf(true), zoomEvents)

        composeRule.onRoot().performTouchInput { doubleClick(onPage()) }
        composeRule.waitForIdle()
        assertEquals(listOf(true, false), zoomEvents)
    }

    @Test
    fun `pinching out zooms and pinching back to 1x leaves zoom`() {
        show(zoomEnabled = true)

        composeRule.onRoot().performTouchInput {
            val y = height * 0.3f
            pinch(
                start0 = Offset(width * 0.4f, y),
                end0 = Offset(width * 0.1f, y),
                start1 = Offset(width * 0.6f, y),
                end1 = Offset(width * 0.9f, y),
            )
        }
        composeRule.waitForIdle()
        assertEquals(listOf(true), zoomEvents)

        composeRule.onRoot().performTouchInput {
            val y = height * 0.3f
            pinch(
                start0 = Offset(width * 0.1f, y),
                end0 = Offset(width * 0.45f, y),
                start1 = Offset(width * 0.9f, y),
                end1 = Offset(width * 0.55f, y),
            )
        }
        composeRule.waitForIdle()
        assertEquals(listOf(true, false), zoomEvents)
    }

    @Test
    fun `one finger pans a zoomed page without leaving zoom`() {
        show(zoomEnabled = true)
        composeRule.onRoot().performTouchInput { doubleClick(onPage()) }
        composeRule.waitForIdle()

        composeRule.onRoot().performTouchInput { swipeUp() }
        composeRule.waitForIdle()

        assertEquals(listOf(true), zoomEvents)
    }

    @Test
    fun `with zoom off a double-tap does nothing and a tap is reported`() {
        show(zoomEnabled = false)

        composeRule.onRoot().performTouchInput { doubleClick(onPage()) }
        composeRule.waitForIdle()
        assertEquals(emptyList<Boolean>(), zoomEvents)

        val tapsBefore = taps
        composeRule.onRoot().performTouchInput { click(onPage()) }
        composeRule.waitForIdle()
        assertEquals(tapsBefore + 1, taps)
    }

    @Test
    fun `a double-tap on the chapter header does not zoom`() {
        show(zoomEnabled = true)

        composeRule.onRoot().performTouchInput { doubleClick(Offset(width * 0.15f, 2f)) }
        composeRule.waitForIdle()

        assertEquals(emptyList<Boolean>(), zoomEvents)
    }
}
