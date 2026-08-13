package com.mymangareader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Dynamic
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableType
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.mymangareader.core.database.ChapterCacheDao
import com.mymangareader.core.database.ChapterCacheEntity
import com.mymangareader.core.database.FollowedSeriesDao
import com.mymangareader.core.database.SeriesSortPrefsDao
import com.mymangareader.core.database.SeriesSortPrefsEntity
import com.mymangareader.core.database.UiPreferencesDao
import com.mymangareader.core.database.UiPreferencesEntity
import com.mymangareader.features.kavita.chapter.KavitaChapterFeature
import com.mymangareader.features.kavita.series.KavitaSeriesFeature
import com.mymangareader.features.kavita.series.SeriesDetail
import com.mymangareader.features.kavita.series.SeriesMetadata
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

private const val EVENT_FOLLOWED_IDS = "seriesFollowedIds"

@Singleton
class SeriesModule @Inject constructor(
    private val kavitaSeriesFeature: KavitaSeriesFeature,
    private val kavitaChapterFeature: KavitaChapterFeature,
    private val chapterCacheDao: ChapterCacheDao,
    private val followedSeriesDao: FollowedSeriesDao,
    private val uiPreferencesDao: UiPreferencesDao,
    private val seriesSortPrefsDao: SeriesSortPrefsDao,
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "SeriesModule"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    init {
        scope.launch {
            followedSeriesDao.observeAllIds().collect { ids ->
                val array = Arguments.createArray().also { arr -> ids.forEach { arr.pushString(it) } }
                reactApplicationContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit(EVENT_FOLLOWED_IDS, array)
            }
        }
    }

    @ReactMethod
    fun getSeriesDetail(seriesId: String, promise: Promise) {
        scope.launch {
            kavitaSeriesFeature.getSeriesDetail(seriesId)
                .onSuccess { promise.resolve(it.toWritableMap()) }
                .onFailure { promise.reject("SERIES_DETAIL_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun getSeriesMetadata(seriesId: String, promise: Promise) {
        scope.launch {
            kavitaSeriesFeature.getSeriesMetadata(seriesId)
                .onSuccess { promise.resolve(it.toWritableMap()) }
                .onFailure { promise.reject("SERIES_METADATA_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun getChapters(seriesId: String, promise: Promise) {
        scope.launch {
            kavitaChapterFeature.listChaptersForSeries(seriesId)
                .onSuccess { promise.resolve(it.toWritableArray()) }
                .onFailure { promise.reject("CHAPTERS_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun getCachedChapters(seriesId: String, promise: Promise) {
        scope.launch {
            runCatching { chapterCacheDao.getBySeriesId(seriesId) }
                .onSuccess { promise.resolve(it.toWritableArray()) }
                .onFailure { promise.reject("CACHED_CHAPTERS_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun replaceCachedChapters(seriesId: String, chapters: ReadableArray, promise: Promise) {
        scope.launch {
            runCatching {
                val entities = (0 until chapters.size()).map { i ->
                    val map = chapters.getMap(i)
                    ChapterCacheEntity(
                        id = map.getString("id") ?: "",
                        seriesId = seriesId,
                        title = map.getString("title") ?: "",
                        number = map.getString("number") ?: "",
                        pageCount = if (map.hasKey("pageCount")) map.getInt("pageCount") else 0,
                        sortOrder = if (map.hasKey("sortOrder")) map.getDouble("sortOrder") else 0.0,
                        readStatus = map.getString("readStatus") ?: "UNREAD",
                        pagesRead = if (map.hasKey("pagesRead")) map.getInt("pagesRead") else 0,
                        updatedAtLocalMs = if (map.hasKey("updatedAtLocalMs") && !map.isNull("updatedAtLocalMs")) {
                            map.getDouble("updatedAtLocalMs").toLong()
                        } else {
                            null
                        },
                    )
                }
                chapterCacheDao.replaceForSeries(seriesId, entities)
            }
                .onSuccess { promise.resolve(null) }
                .onFailure { promise.reject("REPLACE_CHAPTERS_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun markChaptersRead(seriesId: String, chapterIds: ReadableArray, promise: Promise) {
        scope.launch {
            val ids = (0 until chapterIds.size()).map { chapterIds.getString(it) }
            kavitaChapterFeature.markChaptersRead(seriesId, ids)
                .onSuccess { promise.resolve(null) }
                .onFailure { promise.reject("MARK_READ_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun markChaptersUnread(seriesId: String, chapterIds: ReadableArray, promise: Promise) {
        scope.launch {
            val ids = (0 until chapterIds.size()).map { chapterIds.getString(it) }
            kavitaChapterFeature.markChaptersUnread(seriesId, ids)
                .onSuccess { promise.resolve(null) }
                .onFailure { promise.reject("MARK_UNREAD_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun toggleFollow(seriesId: String, promise: Promise) {
        scope.launch {
            runCatching { followedSeriesDao.toggle(seriesId) }
                .onSuccess { promise.resolve(null) }
                .onFailure { promise.reject("FOLLOW_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun getChapterSortPrefs(promise: Promise) {
        scope.launch {
            runCatching { uiPreferencesDao.get() ?: UiPreferencesEntity() }
                .onSuccess { prefs ->
                    Arguments.createMap().apply {
                        putString("mode", prefs.chapterSortMode)
                        prefs.chapterSortFixedThreshold?.let { putDouble("fixedThreshold", it) }
                        putInt("progressPercent", prefs.chapterSortProgressPercent)
                    }.let { promise.resolve(it) }
                }
                .onFailure { promise.reject("SORT_PREFS_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun setChapterSortPrefs(mode: String, fixedThreshold: Dynamic, progressPercent: Int, promise: Promise) {
        val threshold = if (fixedThreshold.type == ReadableType.Number) fixedThreshold.asDouble() else null
        fixedThreshold.recycle()
        scope.launch {
            runCatching {
                val current = uiPreferencesDao.get() ?: UiPreferencesEntity()
                uiPreferencesDao.upsert(
                    current.copy(
                        chapterSortMode = mode,
                        chapterSortFixedThreshold = threshold,
                        chapterSortProgressPercent = progressPercent,
                    ),
                )
            }
                .onSuccess { promise.resolve(null) }
                .onFailure { promise.reject("SORT_PREFS_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun getSeriesSortPrefs(seriesId: String, promise: Promise) {
        scope.launch {
            runCatching { seriesSortPrefsDao.get(seriesId) }
                .onSuccess { prefs ->
                    if (prefs == null) {
                        promise.resolve(null)
                    } else {
                        Arguments.createMap().apply {
                            putString("mode", prefs.chapterSortMode)
                            prefs.chapterSortFixedThreshold?.let { putDouble("fixedThreshold", it) }
                            putInt("progressPercent", prefs.chapterSortProgressPercent)
                        }.let { promise.resolve(it) }
                    }
                }
                .onFailure { promise.reject("SERIES_SORT_PREFS_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun setSeriesSortPrefs(seriesId: String, mode: String, fixedThreshold: Dynamic, progressPercent: Int, promise: Promise) {
        val threshold = if (fixedThreshold.type == ReadableType.Number) fixedThreshold.asDouble() else null
        fixedThreshold.recycle()
        scope.launch {
            runCatching {
                seriesSortPrefsDao.upsert(
                    SeriesSortPrefsEntity(
                        seriesId = seriesId,
                        chapterSortMode = mode,
                        chapterSortFixedThreshold = threshold,
                        chapterSortProgressPercent = progressPercent,
                    ),
                )
            }
                .onSuccess { promise.resolve(null) }
                .onFailure { promise.reject("SERIES_SORT_PREFS_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun resetSeriesSortPrefs(seriesId: String, promise: Promise) {
        scope.launch {
            runCatching { seriesSortPrefsDao.delete(seriesId) }
                .onSuccess { promise.resolve(null) }
                .onFailure { promise.reject("SERIES_SORT_PREFS_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun addListener(eventName: String) = Unit // required by RN event emitter contract

    @ReactMethod
    fun removeListeners(count: Int) = Unit // required by RN event emitter contract

    private fun SeriesDetail.toWritableMap() = Arguments.createMap().apply {
        putString("id", id)
        putString("name", name)
        putString("coverImageUrl", coverImageUrl)
    }

    private fun SeriesMetadata.toWritableMap() = Arguments.createMap().apply {
        summary?.let { putString("summary", it) }
        putArray("genres", Arguments.createArray().also { arr -> genres.forEach { arr.pushString(it) } })
        putArray("tags", Arguments.createArray().also { arr -> tags.forEach { arr.pushString(it) } })
    }

    private fun List<ChapterCacheEntity>.toWritableArray() = Arguments.createArray().also { array ->
        forEach { chapter ->
            Arguments.createMap().apply {
                putString("id", chapter.id)
                putString("seriesId", chapter.seriesId)
                putString("title", chapter.title)
                putString("number", chapter.number)
                putInt("pageCount", chapter.pageCount)
                putDouble("sortOrder", chapter.sortOrder)
                putString("readStatus", chapter.readStatus)
                putInt("pagesRead", chapter.pagesRead)
                chapter.updatedAtLocalMs?.let { putDouble("updatedAtLocalMs", it.toDouble()) }
            }.also { array.pushMap(it) }
        }
    }
}
