package com.mymangareader

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.mymangareader.features.kavita.reader.ui.ChapterBlock
import com.mymangareader.features.kavita.reader.ui.SduNode

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
            pageUrls = pageUrls,
            pageAspectRatios = pageAspectRatios,
            // Server-Driven UI: RN sends the entire Header/Gap (firstNode) and Footer/Gap
            // (lastNode) visual as a data tree — see SduNode.kt. null means "nothing here" (e.g.
            // no Gap-above for the first loaded chapter, no Footer/next-preview when RN hasn't
            // loaded a next neighbor yet); Kotlin never decides this on its own.
            firstNode = map.getMap("firstNode")?.let(::parseSduNode),
            lastNode = map.getMap("lastNode")?.let(::parseSduNode),
        )
    }

    private fun parseSduNode(map: ReadableMap): SduNode? {
        return when (map.getString("type")) {
            "container" -> {
                val direction = if (map.getString("direction") == "horizontal") {
                    SduNode.Container.Direction.HORIZONTAL
                } else {
                    SduNode.Container.Direction.VERTICAL
                }
                val align = when (map.getString("align")) {
                    "start" -> SduNode.Container.Align.START
                    "end" -> SduNode.Container.Align.END
                    else -> SduNode.Container.Align.CENTER
                }
                val childrenArray = map.getArray("children")
                val children = (0 until (childrenArray?.size() ?: 0)).mapNotNull { index ->
                    childrenArray?.getMap(index)?.let(::parseSduNode)
                }
                SduNode.Container(
                    direction = direction,
                    backgroundColor = map.getString("backgroundColor"),
                    heightPx = if (map.hasKey("heightPx")) map.getInt("heightPx") else null,
                    paddingPx = if (map.hasKey("paddingPx")) map.getInt("paddingPx") else 0,
                    gapPx = if (map.hasKey("gapPx")) map.getInt("gapPx") else 0,
                    align = align,
                    children = children,
                )
            }
            "text" -> {
                val text = map.getString("text") ?: return null
                SduNode.TextNode(
                    text = text,
                    color = map.getString("color") ?: "#FFFFFF",
                    fontSizeSp = if (map.hasKey("fontSize")) map.getInt("fontSize") else 14,
                    bold = map.hasKey("bold") && map.getBoolean("bold"),
                    maxLines = if (map.hasKey("maxLines")) map.getInt("maxLines") else Int.MAX_VALUE,
                )
            }
            "spacer" -> SduNode.Spacer(sizePx = if (map.hasKey("sizePx")) map.getInt("sizePx") else 0)
            else -> null
        }
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
        MapBuilder.of(
            "onVisiblePageChanged", MapBuilder.of("registrationName", "onVisiblePageChanged"),
            "onScrollToChapterHandled", MapBuilder.of("registrationName", "onScrollToChapterHandled"),
            "onTap", MapBuilder.of("registrationName", "onTap"),
        )
}
