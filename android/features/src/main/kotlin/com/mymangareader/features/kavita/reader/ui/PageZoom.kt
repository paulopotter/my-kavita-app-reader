package com.mymangareader.features.kavita.reader.ui

import kotlin.math.hypot
import kotlin.math.roundToInt

/** Logcat tag of the zoom's few, per-gesture diagnostic lines. */
internal const val ZOOM_LOG_TAG = "PageZoom"

// Zoom is bound to ONE page of the reader list: the page the user pinched or double-tapped. While
// it is on, that page is drawn alone in a layer over the list (see ReaderPageList), the list's own
// scroll is locked, and dragging pans inside the page's bounds. Leaving zoom hands the list back
// where the pan ended. Everything here is pure math in pixels so it can be tested without Compose.

internal const val ZOOM_MIN_SCALE = 1f

// Tunable ceiling: past this a sampled (downscaled) page stops gaining any readable detail.
internal const val ZOOM_MAX_SCALE = 4f

// What a double-tap goes to from 1x. Another double-tap while zoomed leaves zoom.
internal const val ZOOM_DOUBLE_TAP_SCALE = 2f

// A pinch released at or under this is "back to 1x": leave zoom instead of sitting on 1.03x.
internal const val ZOOM_EXIT_SCALE = 1.05f

/** A list item as the zoom needs it: where it is on screen right now, in viewport pixels. */
internal data class ZoomItem(
    val entryKey: String,
    val topPx: Int,
    val heightPx: Int,
)

/**
 * The zoomed state of a single page. [offsetX]/[offsetY] are where the page's top-left corner sits
 * relative to the viewport's top-left, in pixels, with the page already scaled by [scale]; both
 * stay clamped so the page never leaves a gap inside the viewport.
 */
internal data class PageZoom(
    val entryKey: String,
    val scale: Float,
    val offsetX: Float,
    val offsetY: Float,
    // The page's height and the viewport's size at 1x, in pixels. Fixed for the whole zoom.
    val pageHeightPx: Float,
    val viewportWidthPx: Float,
    val viewportHeightPx: Float,
) {
    /**
     * Scales by [factor] around ([focalX], [focalY]) — the point under the fingers stays under
     * them — then pans by ([panX], [panY]).
     */
    fun transformed(
        factor: Float,
        focalX: Float,
        focalY: Float,
        panX: Float = 0f,
        panY: Float = 0f,
    ): PageZoom {
        val newScale = (scale * factor).coerceIn(ZOOM_MIN_SCALE, ZOOM_MAX_SCALE)
        val applied = newScale / scale
        return copy(
            scale = newScale,
            offsetX = focalX - (focalX - offsetX) * applied + panX,
            offsetY = focalY - (focalY - offsetY) * applied + panY,
        ).clamped()
    }

    /** Keeps the page covering the viewport on both axes; a page shorter than the viewport centers. */
    fun clamped(): PageZoom {
        val scaledWidth = viewportWidthPx * scale
        val scaledHeight = pageHeightPx * scale
        val x = offsetX.coerceIn(minOf(0f, viewportWidthPx - scaledWidth), 0f)
        val y =
            if (scaledHeight <= viewportHeightPx) {
                (viewportHeightPx - scaledHeight) / 2f
            } else {
                offsetY.coerceIn(viewportHeightPx - scaledHeight, 0f)
            }
        return copy(offsetX = x, offsetY = y)
    }

    /** True once the page is back at (or under) 1x — the point where zoom should end. */
    fun isBackToNormal(): Boolean = scale <= ZOOM_EXIT_SCALE

    /**
     * Where the list should sit once zoom ends: how many pixels, at 1x, of the page are above the
     * viewport's top edge — so the reader continues from what was on screen while zoomed.
     */
    fun listScrollOffsetPx(): Int = (-offsetY / scale).roundToInt().coerceIn(0, maxOf(0, pageHeightPx.roundToInt() - 1))

    companion object {
        /** Zoom for [item] starting at 1x exactly where it sits on screen, then scaled by [factor] around the focal point. */
        fun start(
            item: ZoomItem,
            viewportWidthPx: Int,
            viewportHeightPx: Int,
            factor: Float,
            focalX: Float,
            focalY: Float,
        ): PageZoom =
            PageZoom(
                entryKey = item.entryKey,
                scale = ZOOM_MIN_SCALE,
                offsetX = 0f,
                offsetY = item.topPx.toFloat(),
                pageHeightPx = item.heightPx.toFloat(),
                viewportWidthPx = viewportWidthPx.toFloat(),
                viewportHeightPx = viewportHeightPx.toFloat(),
            ).transformed(factor = factor, focalX = focalX, focalY = focalY)
    }
}

/** The page under [y] (viewport pixels), or null when [y] is over a non-page entry or empty space. */
internal fun pageZoomItemAt(
    items: List<ZoomItem>,
    isPage: (String) -> Boolean,
    y: Float,
): ZoomItem? = items.firstOrNull { isPage(it.entryKey) && y >= it.topPx && y < it.topPx + it.heightPx }

/**
 * Starts zoom on the page under [focalY], or null when there is none (a non-page entry, empty
 * space, or a viewport that has not been measured yet). [visible] is what the list shows now.
 */
internal fun startPageZoom(
    visible: List<ZoomItem>,
    viewportWidthPx: Int,
    viewportHeightPx: Int,
    focalX: Float,
    focalY: Float,
    factor: Float,
): PageZoom? {
    if (viewportWidthPx <= 0 || viewportHeightPx <= 0) return null
    // Page keys are "page:<chapterId>:<index>" (ListEntry.key) — Sdu entries are never zoomable.
    val item = pageZoomItemAt(visible, { it.startsWith("page:") }, focalY) ?: return null
    return PageZoom.start(item, viewportWidthPx, viewportHeightPx, factor, focalX, focalY)
}

/** True when the zoomed page cannot stay: zoom was switched off, or its page left the list. */
internal fun shouldDropZoom(
    zoom: PageZoom,
    zoomEnabled: Boolean,
    entryKeys: List<String>,
): Boolean = !zoomEnabled || zoom.entryKey !in entryKeys

/** Where the list goes when zoom ends: the page's index and the pixel offset into it; null if the page is gone. */
internal fun zoomExitTarget(
    zoom: PageZoom,
    entryKeys: List<String>,
): Pair<Int, Int>? {
    val index = entryKeys.indexOf(zoom.entryKey)
    return if (index >= 0) index to zoom.listScrollOffsetPx() else null
}

/**
 * Decides, frame by frame, whether a touch gesture is a page zoom and what to do with it. Kept free
 * of Compose so the rules can be tested: the pointer-input shell only feeds it frames.
 *
 * A gesture qualifies with two fingers down, or with one finger past [touchSlopPx] when
 * [canPanWithOneFinger] says so (only while already zoomed — otherwise one finger is the list's
 * scroll). [onStart] then decides whether to take it over; a "no" is final for that gesture.
 */
internal class PageZoomGestureTracker(
    private val touchSlopPx: Float,
    private val canPanWithOneFinger: () -> Boolean,
    private val onStart: (x: Float, y: Float) -> Boolean,
    private val onTransform: (x: Float, y: Float, panX: Float, panY: Float, factor: Float) -> Unit,
    private val onEnd: () -> Unit,
) {
    private var active = false
    private var declined = false
    private var accumulatedPanX = 0f
    private var accumulatedPanY = 0f

    /** Returns true when this frame's pointer changes belong to the zoom and must be consumed. */
    fun onFrame(
        pressedCount: Int,
        centroidX: Float,
        centroidY: Float,
        panX: Float,
        panY: Float,
        factor: Float,
    ): Boolean {
        if (!active && !declined) {
            accumulatedPanX += panX
            accumulatedPanY += panY
            val pannedPastSlop = hypot(accumulatedPanX, accumulatedPanY) > touchSlopPx
            if (pressedCount >= 2 || (canPanWithOneFinger() && pannedPastSlop)) {
                if (onStart(centroidX, centroidY)) active = true else declined = true
            }
        }
        if (!active) return false
        if (factor != 1f || panX != 0f || panY != 0f) onTransform(centroidX, centroidY, panX, panY, factor)
        return true
    }

    /** The last finger lifted. */
    fun onGestureEnd() {
        if (active) onEnd()
        active = false
        declined = false
        accumulatedPanX = 0f
        accumulatedPanY = 0f
    }
}
