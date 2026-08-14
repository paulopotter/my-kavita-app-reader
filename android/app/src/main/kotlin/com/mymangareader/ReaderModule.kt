package com.mymangareader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.mymangareader.core.database.UiPreferencesDao
import com.mymangareader.features.kavita.ActiveUrlWatcher
import com.mymangareader.features.kavita.chapter.KavitaChapterFeature
import android.view.WindowManager
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

private const val EVENT_ACTIVE_URL_CHANGED = "activeUrlChanged"

@Singleton
class ReaderModule @Inject constructor(
    private val kavitaChapterFeature: KavitaChapterFeature,
    private val activeUrlWatcher: ActiveUrlWatcher,
    private val uiPreferencesDao: UiPreferencesDao,
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "ReaderModule"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    init {
        activeUrlWatcher.start(scope)
        scope.launch {
            activeUrlWatcher.activeUrl.collect { url ->
                if (url == null) return@collect
                val map = Arguments.createMap().apply { putString("url", url) }
                reactApplicationContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit(EVENT_ACTIVE_URL_CHANGED, map)
            }
        }
    }

    @ReactMethod
    fun getPageUrls(chapterId: String, expectedPageCount: Int, promise: Promise) {
        scope.launch {
            kavitaChapterFeature.getPageUrls(chapterId, expectedPageCount)
                .onSuccess { urls ->
                    val array = Arguments.createArray().also { arr -> urls.forEach { arr.pushString(it) } }
                    promise.resolve(array)
                }
                .onFailure { promise.reject("PAGE_URLS_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun invalidatePageCache(chapterId: String, promise: Promise) {
        scope.launch {
            kavitaChapterFeature.invalidatePageCache(chapterId)
                .onSuccess { promise.resolve(null) }
                .onFailure { promise.reject("INVALIDATE_PAGE_CACHE_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun getPageCacheUrls(chapterId: String, promise: Promise) {
        scope.launch {
            kavitaChapterFeature.getPageCacheUrls(chapterId)
                .onSuccess { entries ->
                    val array = Arguments.createArray().also { arr ->
                        entries.forEach { (pageIndex, url) ->
                            Arguments.createMap().apply {
                                putInt("pageIndex", pageIndex)
                                putString("url", url)
                            }.also { arr.pushMap(it) }
                        }
                    }
                    promise.resolve(array)
                }
                .onFailure { promise.reject("PAGE_CACHE_URLS_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun getServerReadProgress(chapterId: String, promise: Promise) {
        scope.launch {
            kavitaChapterFeature.getServerReadProgress(chapterId)
                .onSuccess { page -> if (page == null) promise.resolve(null) else promise.resolve(page) }
                .onFailure { promise.reject("SERVER_PROGRESS_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun getLocalProgress(chapterId: String, promise: Promise) {
        scope.launch {
            kavitaChapterFeature.getLocalProgress(chapterId)
                .onSuccess { local ->
                    if (local == null) {
                        promise.resolve(null)
                    } else {
                        Arguments.createMap().apply {
                            putInt("page", local.page)
                            putDouble("scrollFraction", local.scrollFraction.toDouble())
                        }.let { promise.resolve(it) }
                    }
                }
                .onFailure { promise.reject("LOCAL_PROGRESS_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun saveLocalProgress(chapterId: String, seriesId: String, page: Int, scrollFraction: Double, promise: Promise) {
        scope.launch {
            kavitaChapterFeature.saveLocalProgress(chapterId, seriesId, page, scrollFraction.toFloat())
                .onSuccess { promise.resolve(null) }
                .onFailure { promise.reject("SAVE_LOCAL_PROGRESS_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun saveReadingProgress(chapterId: String, seriesId: String, page: Int, promise: Promise) {
        scope.launch {
            kavitaChapterFeature.saveReadingProgress(chapterId, seriesId, page)
                .onSuccess { promise.resolve(null) }
                .onFailure { promise.reject("SAVE_READING_PROGRESS_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun getKeepScreenOnDuringReading(promise: Promise) {
        scope.launch {
            runCatching { uiPreferencesDao.getKeepScreenOnDuringReading() ?: true }
                .onSuccess { promise.resolve(it) }
                .onFailure { promise.reject("KEEP_SCREEN_ON_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun keepScreenOn(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            currentActivity?.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun allowScreenOff(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            currentActivity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) = Unit // required by RN event emitter contract

    @ReactMethod
    fun removeListeners(count: Int) = Unit // required by RN event emitter contract
}
