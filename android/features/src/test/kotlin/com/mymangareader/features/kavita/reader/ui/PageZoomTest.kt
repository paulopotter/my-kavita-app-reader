package com.mymangareader.features.kavita.reader.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Pure-math tests for the per-page zoom. Fixture: a 1000x2000 viewport and a webtoon page 1000px
 * wide and 6000px tall (a page far taller than the screen, the case zoom exists for).
 */
class PageZoomTest {
    private val viewportWidth = 1000
    private val viewportHeight = 2000
    private val tallPage = ZoomItem(entryKey = "page:c:0", topPx = 0, heightPx = 6000)

    private fun start(
        item: ZoomItem = tallPage,
        factor: Float = 1f,
        focalX: Float = 500f,
        focalY: Float = 1000f,
    ) = PageZoom.start(item, viewportWidth, viewportHeight, factor, focalX, focalY)

    @Test
    fun `starts at 1x exactly where the page sits on screen`() {
        val zoom = start(item = tallPage.copy(topPx = -800))

        assertEquals(1f, zoom.scale, 0f)
        assertEquals(0f, zoom.offsetX, 0f)
        assertEquals(-800f, zoom.offsetY, 0f)
    }

    @Test
    fun `a page whose top is below the viewport top snaps its top to the viewport top`() {
        val zoom = start(item = tallPage.copy(topPx = 600))

        assertEquals(0f, zoom.offsetY, 0f)
    }

    @Test
    fun `scaling keeps the point under the fingers where it was`() {
        val zoom = start(item = tallPage.copy(topPx = -800), factor = 2f, focalX = 400f, focalY = 500f)

        // Page-space point under the focal point before: (400, 500 + 800). After: same point, 2x.
        assertEquals(2f, zoom.scale, 0f)
        assertEquals(-400f, zoom.offsetX, 0.001f)
        assertEquals(500f - 1300f * 2f, zoom.offsetY, 0.001f)
    }

    @Test
    fun `scale never goes past the ceiling nor under 1x`() {
        val capped = start().transformed(factor = 100f, focalX = 0f, focalY = 0f)
        val floored = start(factor = 2f).transformed(factor = 0.01f, focalX = 0f, focalY = 0f)

        assertEquals(ZOOM_MAX_SCALE, capped.scale, 0f)
        assertEquals(ZOOM_MIN_SCALE, floored.scale, 0f)
    }

    @Test
    fun `panning is clamped to the page bounds on both axes`() {
        val zoom = start(factor = 2f)

        val farRightDown = zoom.transformed(factor = 1f, focalX = 0f, focalY = 0f, panX = 5000f, panY = 99999f)
        val farLeftUp = zoom.transformed(factor = 1f, focalX = 0f, focalY = 0f, panX = -5000f, panY = -99999f)

        assertEquals(0f, farRightDown.offsetX, 0f)
        assertEquals(0f, farRightDown.offsetY, 0f)
        assertEquals(viewportWidth - viewportWidth * 2f, farLeftUp.offsetX, 0f)
        assertEquals(viewportHeight - 6000f * 2f, farLeftUp.offsetY, 0f)
    }

    @Test
    fun `a page shorter than the viewport stays centered vertically`() {
        val short = ZoomItem(entryKey = "page:c:1", topPx = 100, heightPx = 600)

        val zoom = PageZoom.start(short, viewportWidth, viewportHeight, 2f, 500f, 400f)

        // 600 * 2 = 1200 < 2000, so (2000 - 1200) / 2.
        assertEquals(400f, zoom.offsetY, 0f)
    }

    @Test
    fun `back to normal is recognised at and just above 1x only`() {
        assertTrue(start().isBackToNormal())
        assertTrue(start(factor = 1.04f).isBackToNormal())
        assertFalse(start(factor = 1.2f).isBackToNormal())
    }

    @Test
    fun `leaving zoom continues from where the pan ended`() {
        // 2x around the viewport middle puts the page top at -1000; panning 3000 further up leaves
        // 4000px (2000 at 1x) of the page above the viewport top.
        val zoom = start(factor = 2f).transformed(factor = 1f, focalX = 0f, focalY = 0f, panY = -3000f)

        assertEquals(2000, zoom.listScrollOffsetPx())
    }

    @Test
    fun `list offset after leaving never goes negative nor past the page`() {
        val atTop = start()
        val atBottom = start(factor = 4f).transformed(factor = 1f, focalX = 0f, focalY = 0f, panY = -999999f)

        assertEquals(0, atTop.listScrollOffsetPx())
        assertTrue(atBottom.listScrollOffsetPx() in 0 until 6000)
    }

    @Test
    fun `finds the page under a point and ignores non-page entries`() {
        val items =
            listOf(
                ZoomItem("first:c", topPx = 0, heightPx = 200),
                ZoomItem("page:c:0", topPx = 200, heightPx = 1000),
                ZoomItem("page:c:1", topPx = 1200, heightPx = 800),
            )
        val isPage = { key: String -> key.startsWith("page:") }

        assertNull(pageZoomItemAt(items, isPage, y = 100f))
        assertEquals("page:c:0", pageZoomItemAt(items, isPage, y = 200f)?.entryKey)
        assertEquals("page:c:0", pageZoomItemAt(items, isPage, y = 1199f)?.entryKey)
        assertEquals("page:c:1", pageZoomItemAt(items, isPage, y = 1200f)?.entryKey)
        assertNull(pageZoomItemAt(items, isPage, y = 2000f))
    }

    // --- startPageZoom / shouldDropZoom / zoomExitTarget ---

    private val visible =
        listOf(
            ZoomItem("first:c", topPx = 0, heightPx = 200),
            ZoomItem("page:c:0", topPx = 200, heightPx = 1800),
        )

    @Test
    fun `startPageZoom zooms the page under the focal point`() {
        val zoom = startPageZoom(visible, viewportWidth, viewportHeight, 500f, 900f, ZOOM_DOUBLE_TAP_SCALE)

        assertEquals("page:c:0", zoom?.entryKey)
        assertEquals(ZOOM_DOUBLE_TAP_SCALE, zoom?.scale)
    }

    @Test
    fun `startPageZoom refuses a non-page entry and an unmeasured viewport`() {
        assertNull(startPageZoom(visible, viewportWidth, viewportHeight, 500f, 100f, 1f))
        assertNull(startPageZoom(visible, 0, viewportHeight, 500f, 900f, 1f))
        assertNull(startPageZoom(visible, viewportWidth, 0, 500f, 900f, 1f))
    }

    @Test
    fun `zoom is dropped when switched off or when its page left the list`() {
        val zoom = start()

        assertFalse(shouldDropZoom(zoom, zoomEnabled = true, entryKeys = listOf("page:c:0")))
        assertTrue(shouldDropZoom(zoom, zoomEnabled = false, entryKeys = listOf("page:c:0")))
        assertTrue(shouldDropZoom(zoom, zoomEnabled = true, entryKeys = listOf("page:c:9")))
    }

    @Test
    fun `leaving zoom targets the page index and the pan offset, or nothing when the page is gone`() {
        val zoom = start(factor = 2f).transformed(factor = 1f, focalX = 0f, focalY = 0f, panY = -3000f)

        assertEquals(1 to 2000, zoomExitTarget(zoom, listOf("first:c", "page:c:0")))
        assertNull(zoomExitTarget(zoom, listOf("first:c")))
    }

    // --- PageZoomGestureTracker ---

    private class Recorder(
        var accept: Boolean = true,
        var zoomed: Boolean = false,
    ) {
        val starts = mutableListOf<Pair<Float, Float>>()
        val transforms = mutableListOf<List<Float>>()
        var ends = 0

        fun tracker() =
            PageZoomGestureTracker(
                touchSlopPx = 10f,
                canPanWithOneFinger = { zoomed },
                onStart = { x, y ->
                    starts += x to y
                    accept
                },
                onTransform = { x, y, panX, panY, factor -> transforms += listOf(x, y, panX, panY, factor) },
                onEnd = { ends++ },
            )
    }

    @Test
    fun `one finger does nothing while not zoomed, however far it drags`() {
        val r = Recorder()
        val tracker = r.tracker()

        assertFalse(tracker.onFrame(1, 0f, 0f, 0f, 500f, 1f))
        assertFalse(tracker.onFrame(1, 0f, 0f, 0f, 500f, 1f))
        tracker.onGestureEnd()

        assertTrue(r.starts.isEmpty())
        assertEquals(0, r.ends)
    }

    @Test
    fun `two fingers take over the gesture, report the transform and end it once`() {
        val r = Recorder()
        val tracker = r.tracker()

        assertTrue(tracker.onFrame(2, 300f, 400f, 5f, 6f, 1.2f))
        assertTrue(tracker.onFrame(2, 310f, 410f, 0f, 0f, 1f)) // consumed, nothing to report
        tracker.onGestureEnd()

        assertEquals(listOf(300f to 400f), r.starts)
        assertEquals(listOf(listOf(300f, 400f, 5f, 6f, 1.2f)), r.transforms)
        assertEquals(1, r.ends)
    }

    @Test
    fun `a refused start is final for that gesture`() {
        val r = Recorder(accept = false)
        val tracker = r.tracker()

        assertFalse(tracker.onFrame(2, 0f, 0f, 0f, 0f, 1.5f))
        assertFalse(tracker.onFrame(2, 0f, 0f, 0f, 0f, 1.5f))
        tracker.onGestureEnd()

        assertEquals(1, r.starts.size)
        assertTrue(r.transforms.isEmpty())
        assertEquals(0, r.ends)
    }

    @Test
    fun `while zoomed one finger pans only once it passes touch slop`() {
        val r = Recorder(zoomed = true)
        val tracker = r.tracker()

        assertFalse(tracker.onFrame(1, 50f, 50f, 3f, 4f, 1f)) // 5px: still a tap
        assertTrue(tracker.onFrame(1, 50f, 50f, 6f, 8f, 1f)) // 15px total: past slop
        tracker.onGestureEnd()

        assertEquals(1, r.starts.size)
        assertEquals(listOf(listOf(50f, 50f, 6f, 8f, 1f)), r.transforms)
        assertEquals(1, r.ends)
    }

    @Test
    fun `the tracker is reusable for the next gesture after one ends`() {
        val r = Recorder()
        val tracker = r.tracker()

        tracker.onFrame(2, 0f, 0f, 0f, 0f, 1.1f)
        tracker.onGestureEnd()
        tracker.onFrame(2, 0f, 0f, 0f, 0f, 1.1f)
        tracker.onGestureEnd()

        assertEquals(2, r.starts.size)
        assertEquals(2, r.ends)
    }
}
