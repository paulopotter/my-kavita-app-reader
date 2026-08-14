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

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
        MapBuilder.of("onVisiblePageChanged", MapBuilder.of("registrationName", "onVisiblePageChanged"))
}
