package com.mymangareader

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.mymangareader.features.kavita.reader.ui.ChapterBlock

class ReaderPageListViewManager : SimpleViewManager<ReaderPageListView>() {

    override fun getName(): String = "ReaderPageListView"

    override fun createViewInstance(reactContext: ThemedReactContext): ReaderPageListView =
        ReaderPageListView(reactContext)

    // RN sends the full list of chapter blocks to render (currently loaded chapter plus
    // whichever neighbors RN has decided to make visible) — this view manager never decides
    // navigation, it only parses what RN sent.
    @ReactProp(name = "blocks")
    fun setBlocks(view: ReaderPageListView, blocks: ReadableArray?) {
        val parsed = (0 until (blocks?.size() ?: 0)).mapNotNull { index ->
            blocks?.getMap(index)?.let(::parseBlock)
        }
        view.setBlocks(parsed)
    }

    // One-shot scroll request: RN sets this to jump the list to a specific chapter/page (e.g.
    // "continue reading" on open), then clears it back to null once onScrollToChapterHandled
    // fires — see ReaderPageList's scrollToChapterId doc for why this must stay one-shot.
    @ReactProp(name = "scrollToChapterId")
    fun setScrollToChapterId(view: ReaderPageListView, chapterId: String?) {
        view.setScrollToChapterId(chapterId)
    }

    @ReactProp(name = "scrollToPageIndex", defaultInt = -1)
    fun setScrollToPageIndex(view: ReaderPageListView, pageIndex: Int) {
        view.setScrollToPageIndex(pageIndex.takeIf { it >= 0 })
    }

    private fun parseBlock(map: ReadableMap): ChapterBlock? {
        val chapterId = map.getString("chapterId") ?: return null
        val chapterTitle = map.getString("chapterTitle") ?: return null
        val pageUrlsArray = map.getArray("pageUrls") ?: return null
        val pageUrls = (0 until pageUrlsArray.size()).mapNotNull { pageUrlsArray.getString(it) }
        // 0 (or a missing/short array) means "unavailable" for that page — ReaderPageList treats
        // a non-positive ratio the same as never having received one, falling back to measuring
        // that page once it's actually decoded on-device. See ChapterBlock.pageAspectRatios.
        val pageAspectRatiosArray = map.getArray("pageAspectRatios")
        val pageAspectRatios = pageUrls.indices.map { index ->
            pageAspectRatiosArray?.takeIf { index < it.size() }?.getDouble(index)?.toFloat() ?: 0f
        }
        return ChapterBlock(
            chapterId = chapterId,
            chapterTitle = chapterTitle,
            pageUrls = pageUrls,
            pageAspectRatios = pageAspectRatios,
            nextChapterTitle = map.getString("nextChapterTitle"),
            endOfChapterLabel = map.getString("endOfChapterLabel").orEmpty(),
            nextChapterLabel = map.getString("nextChapterLabel").orEmpty(),
        )
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
        MapBuilder.of(
            "onVisiblePageChanged", MapBuilder.of("registrationName", "onVisiblePageChanged"),
            "onScrollToChapterHandled", MapBuilder.of("registrationName", "onScrollToChapterHandled"),
            "onTap", MapBuilder.of("registrationName", "onTap"),
        )
}
