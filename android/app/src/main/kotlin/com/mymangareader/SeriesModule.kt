package com.mymangareader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.mymangareader.core.database.ChapterCacheDao
import com.mymangareader.core.database.ChapterCacheEntity
import com.mymangareader.core.database.FollowedSeriesDao
import com.mymangareader.features.kavita.chapter.KavitaChapterFeature
import com.mymangareader.features.kavita.series.KavitaSeriesFeature
import com.mymangareader.features.kavita.series.SeriesDetail
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

private const val EVENT_FOLLOWED_IDS = "seriesFollowedIds"

// Task 024 — the methods this module used to expose beyond what's kept here (getSeriesMetadata,
// getCachedSeriesDetail/Metadata, getChapters, replaceCachedChapters, toggleFollow/
// isSeriesFollowed, and the 3 chapter-sort-prefs methods) had no real RN caller left once the
// legacy SeriesDetailScreen was deleted — SerieScreen's own tools (SerieTool/ChapterTool/
// ChaptersTool) already cover the same concerns through DigestBridge/FollowedSeriesBridgeModule/
// PreferencesBridgeModule instead. What's left here (getSeriesDetail/getCachedChapters/
// markChaptersRead/Unread, plus the 2 emitters) is what ReaderService/useReader/useLibrary still
// genuinely depend on.
@Singleton
class SeriesModule
    @Inject
    constructor(
        private val kavitaSeriesFeature: KavitaSeriesFeature,
        private val kavitaChapterFeature: KavitaChapterFeature,
        private val chapterCacheDao: ChapterCacheDao,
        private val followedSeriesDao: FollowedSeriesDao,
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
        fun getSeriesDetail(
            seriesId: String,
            promise: Promise,
        ) {
            scope.launch {
                kavitaSeriesFeature.getSeriesDetail(seriesId).resolveOrReject(promise, "SERIES_DETAIL_ERROR") { it.toWritableMap() }
            }
        }

        @ReactMethod
        fun getCachedChapters(
            seriesId: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching { chapterCacheDao.getBySeriesId(seriesId) }
                    .resolveOrReject(promise, "CACHED_CHAPTERS_ERROR") { it.toWritableArray() }
            }
        }

        @ReactMethod
        fun markChaptersRead(
            seriesId: String,
            chapterIds: ReadableArray,
            promise: Promise,
        ) {
            scope.launch {
                val ids = (0 until chapterIds.size()).map { chapterIds.getString(it) }
                kavitaChapterFeature
                    .markChaptersRead(seriesId, ids)
                    .resolveOrReject(promise, "MARK_READ_ERROR")
            }
        }

        @ReactMethod
        fun markChaptersUnread(
            seriesId: String,
            chapterIds: ReadableArray,
            promise: Promise,
        ) {
            scope.launch {
                val ids = (0 until chapterIds.size()).map { chapterIds.getString(it) }
                kavitaChapterFeature
                    .markChaptersUnread(seriesId, ids)
                    .resolveOrReject(promise, "MARK_UNREAD_ERROR")
            }
        }

        // Nota (plano 017, Task 025): markChaptersRead/Unread emitiam um evento nativo
        // `seriesProgressChanged` (lógica duplicada byte-a-byte com ReaderChapterModule) para a
        // Library reagir ao progresso sem refetch. Derivava tudo do cache LOCAL (Room), sem origem
        // no servidor — não é responsabilidade de uma bridge Kotlin. Removido daqui e de
        // ReaderChapterModule; a notificação volta pelo EventBus RN→RN (Task 013), emitida no RN
        // por quem dispara a marcação. O emitter EVENT_FOLLOWED_IDS abaixo permanece porque a
        // origem dele (Room observando followedSeriesDao) é genuinamente nativa.

        @ReactMethod
        fun addListener(eventName: String) = Unit // required by RN event emitter contract

        @ReactMethod
        fun removeListeners(count: Int) = Unit // required by RN event emitter contract

        private fun SeriesDetail.toWritableMap() =
            Arguments.createMap().apply {
                putString("id", id)
                putString("name", name)
                putString("coverImageUrl", coverImageUrl)
            }

        private fun List<ChapterCacheEntity>.toWritableArray() =
            Arguments.createArray().also { array ->
                forEach { chapter ->
                    Arguments
                        .createMap()
                        .apply {
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
