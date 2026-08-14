package com.mymangareader

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.AbstractComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.mymangareader.features.kavita.reader.ui.ReaderPageList

/**
 * Native scrollable page list for the reader screen, exposed to React Native via
 * [ReaderPageListViewManager]. Renders through Jetpack Compose (see ReaderPageList in
 * features/) instead of classic View + manual bitmap slicing — tall webtoon pages kept
 * rendering as a collapsed strip / going black under the classic ImageView + GL texture
 * pipeline (GL_MAX_TEXTURE_SIZE ceiling, plus unreliable WebP region decoding) even after
 * fixing threading and decode strategy. Compose's own draw pipeline (RenderNode/Canvas,
 * constrained to screen width by fillMaxWidth() inside LazyColumn) doesn't hit that ceiling,
 * matching the proven behavior of the reference project (my-manga-app-reader).
 */
class ReaderPageListView(context: Context) : AbstractComposeView(context) {

    private var currentPageUrls by mutableStateOf<List<String>>(emptyList())

    init {
        // RN can detach/reattach this View across re-renders of the host screen; the default
        // strategy disposes composition on ViewTreeLifecycleOwner destruction, which never fires
        // for a plain detach — DisposeOnDetachedFromWindow releases Compose resources correctly.
        setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnDetachedFromWindow)
    }

    fun setPageUrls(urls: List<String>) {
        // TEMP DEBUG: isolating to the first 2 pages only, to validate the Compose rendering
        // (WebP + PNG) before re-enabling the full chapter — see PageListAdapterTest history for
        // why the classic-View slicing approach failed on the same 2-page sample.
        currentPageUrls = urls.take(2)
    }

    @androidx.compose.runtime.Composable
    override fun Content() {
        ReaderPageList(pageUrls = currentPageUrls, onVisiblePageChanged = ::emitVisiblePageChanged)
    }

    private fun emitVisiblePageChanged(pageIndex: Int) {
        val payload = Arguments.createMap().apply { putInt("pageIndex", pageIndex) }
        val reactContext = context as? ReactContext ?: return
        reactContext
            .getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(id, "onVisiblePageChanged", payload)
    }
}
