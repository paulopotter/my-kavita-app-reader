package com.mymangareader

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class ReaderPageListViewManager : SimpleViewManager<ReaderPageListView>() {

    override fun getName(): String = "ReaderPageListView"

    override fun createViewInstance(reactContext: ThemedReactContext): ReaderPageListView =
        ReaderPageListView(reactContext)

    @ReactProp(name = "pageUrls")
    fun setPageUrls(view: ReaderPageListView, pageUrls: ReadableArray?) {
        val urls = (0 until (pageUrls?.size() ?: 0)).mapNotNull { pageUrls?.getString(it) }
        view.setPageUrls(urls)
    }

    @ReactProp(name = "chapterTitle")
    fun setChapterTitle(view: ReaderPageListView, chapterTitle: String?) {
        view.setChapterTitle(chapterTitle.orEmpty())
    }

    @ReactProp(name = "nextChapterTitle")
    fun setNextChapterTitle(view: ReaderPageListView, nextChapterTitle: String?) {
        view.setNextChapterTitle(nextChapterTitle)
    }

    @ReactProp(name = "endOfChapterLabel")
    fun setEndOfChapterLabel(view: ReaderPageListView, endOfChapterLabel: String?) {
        view.setEndOfChapterLabel(endOfChapterLabel.orEmpty())
    }

    @ReactProp(name = "nextChapterLabel")
    fun setNextChapterLabel(view: ReaderPageListView, nextChapterLabel: String?) {
        view.setNextChapterLabel(nextChapterLabel.orEmpty())
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
        MapBuilder.of("onVisiblePageChanged", MapBuilder.of("registrationName", "onVisiblePageChanged"))
}
