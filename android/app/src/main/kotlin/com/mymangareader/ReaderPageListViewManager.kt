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

    override fun createViewInstance(reactContext: ThemedReactContext): ReaderPageListView = ReaderPageListView(reactContext)

    // RN sends the full list of chapter blocks to render (currently loaded chapter plus
    // whichever neighbors RN has decided to make visible) — this view manager never decides
    // navigation, it only parses what RN sent.
    @ReactProp(name = "blocks")
    fun setBlocks(
        view: ReaderPageListView,
        blocks: ReadableArray?,
    ) {
        val parsed =
            (0 until (blocks?.size() ?: 0)).mapNotNull { index ->
                blocks?.getMap(index)?.let(::parseBlock)
            }
        view.setBlocks(parsed)
    }

    // One-shot scroll request: RN sets this to jump the list to a specific chapter/page (e.g.
    // "continue reading" on open), then clears it back to null once onScrollToChapterHandled
    // fires — see ReaderPageList's scrollToChapterId doc for why this must stay one-shot.
    @ReactProp(name = "scrollToChapterId")
    fun setScrollToChapterId(
        view: ReaderPageListView,
        chapterId: String?,
    ) {
        view.setScrollToChapterId(chapterId)
    }

    @ReactProp(name = "scrollToPageIndex", defaultInt = -1)
    fun setScrollToPageIndex(
        view: ReaderPageListView,
        pageIndex: Int,
    ) {
        view.setScrollToPageIndex(pageIndex.takeIf { it >= 0 })
    }

    // What a page draws while loading and when it fails, as SDU. RN owns both so the colours
    // follow the active theme and the words the app's language; Kotlin keeps a plain fallback for
    // when they are absent.
    @ReactProp(name = "pageLoadingNode")
    fun setPageLoadingNode(
        view: ReaderPageListView,
        node: ReadableMap?,
    ) {
        view.setPageLoadingNode(node?.let(::parseSduNode))
    }

    @ReactProp(name = "pageErrorNode")
    fun setPageErrorNode(
        view: ReaderPageListView,
        node: ReadableMap?,
    ) {
        view.setPageErrorNode(node?.let(::parseSduNode))
    }

    private fun parseBlock(map: ReadableMap): ChapterBlock? {
        val chapterId = map.getString("chapterId") ?: return null
        val pageUrlsArray = map.getArray("pageUrls") ?: return null
        val pageUrls = (0 until pageUrlsArray.size()).mapNotNull { pageUrlsArray.getString(it) }
        // 0 (or a missing/short array) means "unavailable" for that page — ReaderPageList treats
        // a non-positive ratio the same as never having received one, falling back to measuring
        // that page once it's actually decoded on-device. See ChapterBlock.pageAspectRatios.
        val pageAspectRatiosArray = map.getArray("pageAspectRatios")
        val pageAspectRatios =
            pageUrls.indices.map { index ->
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

    private fun parseChildren(map: ReadableMap): List<SduNode> {
        val children = map.getArray("children")
        return (0 until (children?.size() ?: 0)).mapNotNull { index ->
            children?.getMap(index)?.let(::parseSduNode)
        }
    }

    private fun parseSduNode(map: ReadableMap): SduNode? {
        return when (map.getString("type")) {
            "container" -> {
                val direction =
                    if (map.getString("direction") == "horizontal") {
                        SduNode.Container.Direction.HORIZONTAL
                    } else {
                        SduNode.Container.Direction.VERTICAL
                    }
                val align =
                    when (map.getString("align")) {
                        "start" -> SduNode.Container.Align.START
                        "end" -> SduNode.Container.Align.END
                        else -> SduNode.Container.Align.CENTER
                    }
                SduNode.Container(
                    direction = direction,
                    backgroundColor = map.getString("backgroundColor"),
                    heightDp = if (map.hasKey("heightDp")) map.getInt("heightDp") else null,
                    paddingDp = if (map.hasKey("paddingDp")) map.getInt("paddingDp") else 0,
                    gapDp = if (map.hasKey("gapDp")) map.getInt("gapDp") else 0,
                    align = align,
                    children = parseChildren(map),
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
                    placeholder = map.getString("placeholder"),
                )
            }
            "spacer" -> SduNode.Spacer(sizeDp = if (map.hasKey("sizeDp")) map.getInt("sizeDp") else 0)
            "spinner" ->
                SduNode.Spinner(
                    color = map.getString("color") ?: "#FFFFFF",
                    sizeDp = if (map.hasKey("sizeDp")) map.getInt("sizeDp") else 48,
                )
            "pressable" -> {
                val action = map.getString("action") ?: return null
                SduNode.Pressable(
                    action = action,
                    backgroundColor = map.getString("backgroundColor"),
                    cornerRadiusDp = if (map.hasKey("cornerRadiusDp")) map.getInt("cornerRadiusDp") else 0,
                    paddingHorizontalDp = if (map.hasKey("paddingHorizontalDp")) map.getInt("paddingHorizontalDp") else 0,
                    paddingVerticalDp = if (map.hasKey("paddingVerticalDp")) map.getInt("paddingVerticalDp") else 0,
                    children = parseChildren(map),
                )
            }
            else -> null
        }
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
        MapBuilder.of(
            "onVisiblePageChanged",
            MapBuilder.of("registrationName", "onVisiblePageChanged"),
            "onScrollToChapterHandled",
            MapBuilder.of("registrationName", "onScrollToChapterHandled"),
            "onTap",
            MapBuilder.of("registrationName", "onTap"),
        )
}
