package com.mymangareader.features.kavita.reader.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.calculateCentroid
import androidx.compose.foundation.gestures.calculatePan
import androidx.compose.foundation.gestures.calculateZoom
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.PointerInputScope
import androidx.compose.ui.input.pointer.positionChanged
import androidx.compose.ui.layout.layout
import androidx.compose.ui.unit.Constraints

/**
 * Pinch / pan detector for the per-page zoom. Runs in the Initial pass, so a gesture it takes over
 * never reaches the scrolling list underneath. The rules live in [PageZoomGestureTracker]; this is
 * only the shell that feeds it pointer frames.
 */
internal suspend fun PointerInputScope.detectPageZoomGestures(
    allowSingleFinger: () -> Boolean,
    onStart: (centroid: Offset) -> Boolean,
    onTransform: (centroid: Offset, pan: Offset, zoom: Float) -> Unit,
    onEnd: () -> Unit,
) {
    awaitEachGesture {
        awaitFirstDown(requireUnconsumed = false, pass = PointerEventPass.Initial)
        val tracker =
            PageZoomGestureTracker(
                touchSlopPx = viewConfiguration.touchSlop,
                canPanWithOneFinger = allowSingleFinger,
                onStart = { x, y -> onStart(Offset(x, y)) },
                onTransform = { x, y, panX, panY, factor -> onTransform(Offset(x, y), Offset(panX, panY), factor) },
                onEnd = onEnd,
            )
        do {
            val event = awaitPointerEvent(PointerEventPass.Initial)
            val centroid = event.calculateCentroid(useCurrent = true)
            val pan = event.calculatePan()
            val consume =
                tracker.onFrame(
                    pressedCount = event.changes.count { it.pressed },
                    centroidX = centroid.x,
                    centroidY = centroid.y,
                    panX = pan.x,
                    panY = pan.y,
                    factor = event.calculateZoom(),
                )
            if (consume) event.changes.forEach { if (it.positionChanged()) it.consume() }
        } while (event.changes.any { it.pressed })
        tracker.onGestureEnd()
    }
}

/**
 * The zoomed page, drawn alone over the list: the page laid out at its 1x size and then scaled and
 * moved by [zoom] — a graphics-layer transform, so panning never re-lays-out a tall bitmap.
 */
@Composable
internal fun ZoomedPageLayer(
    zoom: PageZoom,
    modifier: Modifier = Modifier,
    page: @Composable () -> Unit,
) {
    Box(modifier = modifier.fillMaxSize().clipToBounds().background(Color.Black)) {
        Box(
            modifier =
                Modifier
                    .layout { measurable, constraints ->
                        // The page keeps its 1x size even when taller than the viewport: it is the
                        // graphics layer below that decides how much of it shows.
                        val placeable =
                            measurable.measure(
                                Constraints.fixed(zoom.viewportWidthPx.toInt(), zoom.pageHeightPx.toInt()),
                            )
                        layout(constraints.maxWidth, constraints.maxHeight) { placeable.place(0, 0) }
                    }.graphicsLayer {
                        transformOrigin = TransformOrigin(0f, 0f)
                        scaleX = zoom.scale
                        scaleY = zoom.scale
                        translationX = zoom.offsetX
                        translationY = zoom.offsetY
                    },
        ) {
            page()
        }
    }
}
