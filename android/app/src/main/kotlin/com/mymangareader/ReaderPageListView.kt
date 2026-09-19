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
import com.mymangareader.features.kavita.reader.ui.ChapterBlock
import com.mymangareader.features.kavita.reader.ui.ReaderPageList
import com.mymangareader.features.kavita.reader.ui.SduNode

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
class ReaderPageListView(
    context: Context,
) : AbstractComposeView(context) {
    private var currentBlocks by mutableStateOf<List<ChapterBlock>>(emptyList())
    private var currentScrollToChapterId by mutableStateOf<String?>(null)
    private var currentScrollToPageIndex by mutableStateOf<Int?>(null)
    private var currentPageLoadingNode by mutableStateOf<SduNode?>(null)
    private var currentPageErrorNode by mutableStateOf<SduNode?>(null)

    init {
        // RN can detach/reattach this View across re-renders of the host screen; the default
        // strategy disposes composition on ViewTreeLifecycleOwner destruction, which never fires
        // for a plain detach — DisposeOnDetachedFromWindow releases Compose resources correctly.
        setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnDetachedFromWindow)
    }

    // RN owns every navigation decision (which chapters are loaded, when to slide the trio
    // forward/back) — this View never decides that itself, it only renders whatever list of
    // chapter blocks it's handed. See ReaderPageListViewManager for the prop shape RN sends.
    fun setBlocks(blocks: List<ChapterBlock>) {
        currentBlocks = blocks
    }

    fun setScrollToChapterId(chapterId: String?) {
        currentScrollToChapterId = chapterId
    }

    fun setScrollToPageIndex(pageIndex: Int?) {
        currentScrollToPageIndex = pageIndex
    }

    // What a page draws while loading and when it fails. RN owns both so they follow the active
    // theme and the app's language — see ReaderPageList for the fallback when they are absent.
    fun setPageLoadingNode(node: SduNode?) {
        currentPageLoadingNode = node
    }

    fun setPageErrorNode(node: SduNode?) {
        currentPageErrorNode = node
    }

    @androidx.compose.runtime.Composable
    override fun Content() {
        ReaderPageList(
            blocks = currentBlocks,
            scrollToChapterId = currentScrollToChapterId,
            scrollToPageIndex = currentScrollToPageIndex,
            onVisiblePageChanged = ::emitVisiblePageChanged,
            onScrollToChapterHandled = ::emitScrollToChapterHandled,
            onTap = ::emitTap,
            pageLoadingNode = currentPageLoadingNode,
            pageErrorNode = currentPageErrorNode,
        )
    }

    private fun emitVisiblePageChanged(
        chapterId: String,
        pageIndex: Int,
        pageFraction: Float,
        chapterFraction: Float,
    ) {
        val payload =
            Arguments.createMap().apply {
                putString("chapterId", chapterId)
                putInt("pageIndex", pageIndex)
                putDouble("pageFraction", pageFraction.toDouble())
                putDouble("chapterFraction", chapterFraction.toDouble())
            }
        val reactContext = context as? ReactContext ?: return
        reactContext
            .getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(id, "onVisiblePageChanged", payload)
    }

    private fun emitScrollToChapterHandled() {
        val reactContext = context as? ReactContext ?: return
        reactContext
            .getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(id, "onScrollToChapterHandled", Arguments.createMap())
    }

    private fun emitTap() {
        val reactContext = context as? ReactContext ?: return
        reactContext
            .getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(id, "onTap", Arguments.createMap())
    }
}
