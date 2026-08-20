package com.mymangareader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.mymangareader.features.kavita.chapter.ChapterDataSource
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

// Reader chapter/page data bridge — a thin RPC layer over ChapterDataSource, never over
// KavitaChapterFeature directly. Swapping the manga provider means adding a new
// ChapterDataSource implementation and rebinding it in FeaturesModule; this module never
// changes. See ChapterDataSource's doc for the rationale.
@Singleton
class ReaderChapterModule @Inject constructor(
    private val chapterDataSource: ChapterDataSource,
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "ReaderChapterModule"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    @ReactMethod
    fun getPageUrls(chapterId: String, expectedPageCount: Int, promise: Promise) {
        scope.launch {
            chapterDataSource.getPageUrls(chapterId, expectedPageCount).resolveOrReject(promise, "PAGE_URLS_ERROR") { urls ->
                Arguments.createArray().also { arr -> urls.forEach { arr.pushString(it) } }
            }
        }
    }

    @ReactMethod
    fun invalidatePageCache(chapterId: String, promise: Promise) {
        scope.launch {
            chapterDataSource.invalidatePageCache(chapterId).resolveOrReject(promise, "INVALIDATE_PAGE_CACHE_ERROR")
        }
    }

    @ReactMethod
    fun getPageCacheUrls(chapterId: String, promise: Promise) {
        scope.launch {
            chapterDataSource.getPageCacheUrls(chapterId).resolveOrReject(promise, "PAGE_CACHE_URLS_ERROR") { entries ->
                Arguments.createArray().also { arr ->
                    entries.forEach { (pageIndex, url) ->
                        Arguments.createMap().apply {
                            putInt("pageIndex", pageIndex)
                            putString("url", url)
                        }.also { arr.pushMap(it) }
                    }
                }
            }
        }
    }

    @ReactMethod
    fun getPageDimensions(chapterId: String, promise: Promise) {
        scope.launch {
            chapterDataSource.getPageDimensions(chapterId).resolveOrReject(promise, "PAGE_DIMENSIONS_ERROR") { dimensions ->
                Arguments.createArray().also { arr ->
                    dimensions.forEach { dimension ->
                        Arguments.createMap().apply {
                            putInt("pageNumber", dimension.pageNumber)
                            putInt("width", dimension.width)
                            putInt("height", dimension.height)
                        }.also { arr.pushMap(it) }
                    }
                }
            }
        }
    }

    @ReactMethod
    fun getServerReadProgress(chapterId: String, promise: Promise) {
        scope.launch {
            chapterDataSource.getServerReadProgress(chapterId).resolveOrReject(promise, "SERVER_PROGRESS_ERROR")
        }
    }

    @ReactMethod
    fun getLocalProgress(chapterId: String, promise: Promise) {
        scope.launch {
            chapterDataSource.getLocalProgress(chapterId).resolveOrReject(promise, "LOCAL_PROGRESS_ERROR") { local ->
                local?.let {
                    Arguments.createMap().apply {
                        putInt("page", it.page)
                        putDouble("scrollFraction", it.scrollFraction.toDouble())
                    }
                }
            }
        }
    }

    @ReactMethod
    fun saveLocalProgress(chapterId: String, seriesId: String, page: Int, scrollFraction: Double, promise: Promise) {
        scope.launch {
            chapterDataSource.saveLocalProgress(chapterId, seriesId, page, scrollFraction.toFloat())
                .resolveOrReject(promise, "SAVE_LOCAL_PROGRESS_ERROR")
        }
    }

    @ReactMethod
    fun saveReadingProgress(chapterId: String, seriesId: String, page: Int, promise: Promise) {
        scope.launch {
            chapterDataSource.saveReadingProgress(chapterId, seriesId, page).resolveOrReject(promise, "SAVE_READING_PROGRESS_ERROR")
        }
    }
}
