package com.mymangareader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Dynamic
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableType
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
private const val EVENT_PROGRESS_CHANGED = "seriesProgressChanged"

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
                // Room's Flow emits the current state immediately on collection, which can race
                // ahead of the JS bridge finishing setup (this module is constructed by Hilt as
                // soon as the DI graph is ready, not once React is actually up) — emit() before
                // that point crashes with IllegalStateException. Silently dropping an emission
                // here is safe: initial state reaches JS through explicit getters like
                // getSeriesDetail once the bridge is ready, only live updates go through this path.
                val array = Arguments.createArray().also { arr -> ids.forEach { arr.pushString(it) } }
                reactApplicationContext.emitEvent(EVENT_FOLLOWED_IDS, array)
            }
        }
    }

    @ReactMethod
    fun getSeriesDetail(seriesId: String, promise: Promise) {
        scope.launch {
            kavitaSeriesFeature.getSeriesDetail(seriesId).resolveOrReject(promise, "SERIES_DETAIL_ERROR") { it.toWritableMap() }
        }
    }

    @ReactMethod
    fun getSeriesMetadata(seriesId: String, promise: Promise) {
        scope.launch {
            kavitaSeriesFeature.getSeriesMetadata(seriesId).resolveOrReject(promise, "SERIES_METADATA_ERROR") { it.toWritableMap() }
        }
    }

    @ReactMethod
    fun getCachedSeriesDetail(seriesId: String, promise: Promise) {
        scope.launch {
            runCatching { kavitaSeriesFeature.getCachedSeriesDetail(seriesId) }
                .resolveOrReject(promise, "CACHED_SERIES_DETAIL_ERROR") { it?.toWritableMap() }
        }
    }

    @ReactMethod
    fun getCachedSeriesMetadata(seriesId: String, promise: Promise) {
        scope.launch {
            runCatching { kavitaSeriesFeature.getCachedSeriesMetadata(seriesId) }
                .resolveOrReject(promise, "CACHED_SERIES_METADATA_ERROR") { it?.toWritableMap() }
        }
    }

    @ReactMethod
    fun getChapters(seriesId: String, promise: Promise) {
        scope.launch {
            kavitaChapterFeature.listChaptersForSeries(seriesId).resolveOrReject(promise, "CHAPTERS_ERROR") { it.toWritableArray() }
        }
    }

    @ReactMethod
    fun getCachedChapters(seriesId: String, promise: Promise) {
        scope.launch {
            runCatching { chapterCacheDao.getBySeriesId(seriesId) }
                .resolveOrReject(promise, "CACHED_CHAPTERS_ERROR") { it.toWritableArray() }
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
            }.resolveOrReject(promise, "REPLACE_CHAPTERS_ERROR")
        }
    }

    @ReactMethod
    fun markChaptersRead(seriesId: String, chapterIds: ReadableArray, promise: Promise) {
        scope.launch {
            val ids = (0 until chapterIds.size()).map { chapterIds.getString(it) }
            kavitaChapterFeature.markChaptersRead(seriesId, ids)
                .onSuccess { runCatching { emitProgressChanged(seriesId) } }
                .resolveOrReject(promise, "MARK_READ_ERROR")
        }
    }

    @ReactMethod
    fun markChaptersUnread(seriesId: String, chapterIds: ReadableArray, promise: Promise) {
        scope.launch {
            val ids = (0 until chapterIds.size()).map { chapterIds.getString(it) }
            kavitaChapterFeature.markChaptersUnread(seriesId, ids)
                .onSuccess { runCatching { emitProgressChanged(seriesId) } }
                .resolveOrReject(promise, "MARK_UNREAD_ERROR")
        }
    }

    // Notifica telas montadas (ex: Library, mantida viva na pilha de navegação) que o progresso de
    // leitura de uma série mudou, sem elas precisarem esperar o TTL do cache em memória do
    // LibraryModule expirar nem fazer um refetch completo — mesmo padrão do EVENT_FOLLOWED_IDS.
    // readChapters/chapterCount usam a mesma lógica de KavitaSeriesFeature.resolveProgress (cache
    // local como fonte de verdade de progresso), evitando duplicar o cálculo de readStatus aqui.
    // Best-effort: uma falha aqui nunca deve impedir a Promise de markChaptersRead/Unread de
    // resolver — ver os runCatching nos call sites acima.
    private suspend fun emitProgressChanged(seriesId: String) {
        val chapters = chapterCacheDao.getBySeriesId(seriesId)
        if (chapters.isEmpty()) return
        val readCount = chapters.count { it.readStatus == "READ" }
        val progressFraction = readCount.toFloat() / chapters.size
        val payload = Arguments.createMap().apply {
            putString("seriesId", seriesId)
            putDouble("progressFraction", progressFraction.toDouble())
            putInt("readChapters", readCount)
            putInt("chapterCount", chapters.size)
        }
        reactApplicationContext.emitEvent(EVENT_PROGRESS_CHANGED, payload)
    }

    @ReactMethod
    fun toggleFollow(seriesId: String, promise: Promise) {
        scope.launch {
            runCatching { followedSeriesDao.toggle(seriesId) }.resolveOrReject(promise, "FOLLOW_ERROR")
        }
    }

    @ReactMethod
    fun isSeriesFollowed(seriesId: String, promise: Promise) {
        scope.launch {
            runCatching { followedSeriesDao.isFollowed(seriesId) }.resolveOrReject(promise, "FOLLOW_ERROR")
        }
    }

    @ReactMethod
    fun getChapterSortPrefs(promise: Promise) {
        scope.launch {
            runCatching { uiPreferencesDao.get() ?: UiPreferencesEntity() }
                .resolveOrReject(promise, "SORT_PREFS_ERROR") { prefs ->
                    Arguments.createMap().apply {
                        putString("mode", prefs.chapterSortMode)
                        prefs.chapterSortFixedThreshold?.let { putDouble("fixedThreshold", it) }
                        putInt("progressPercent", prefs.chapterSortProgressPercent)
                    }
                }
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
            }.resolveOrReject(promise, "SORT_PREFS_ERROR")
        }
    }

    @ReactMethod
    fun getSeriesSortPrefs(seriesId: String, promise: Promise) {
        scope.launch {
            runCatching { seriesSortPrefsDao.get(seriesId) }
                .resolveOrReject(promise, "SERIES_SORT_PREFS_ERROR") { prefs ->
                    prefs?.let {
                        Arguments.createMap().apply {
                            putString("mode", it.chapterSortMode)
                            it.chapterSortFixedThreshold?.let { threshold -> putDouble("fixedThreshold", threshold) }
                            putInt("progressPercent", it.chapterSortProgressPercent)
                        }
                    }
                }
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
            }.resolveOrReject(promise, "SERIES_SORT_PREFS_ERROR")
        }
    }

    @ReactMethod
    fun resetSeriesSortPrefs(seriesId: String, promise: Promise) {
        scope.launch {
            runCatching { seriesSortPrefsDao.delete(seriesId) }.resolveOrReject(promise, "SERIES_SORT_PREFS_ERROR")
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
