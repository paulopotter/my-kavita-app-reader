package com.mymangareader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.mymangareader.core.database.FollowedSeriesDao
import com.mymangareader.features.bff.BffFeature
import com.mymangareader.features.kavita.KavitaSeriesFeature
import com.mymangareader.features.kavita.SeriesSummary
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LibraryModule @Inject constructor(
    private val kavitaSeriesFeature: KavitaSeriesFeature,
    private val bffFeature: BffFeature,
    private val followedSeriesDao: FollowedSeriesDao,
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "LibraryModule"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    @Volatile private var lastSeries: List<SeriesSummary> = emptyList()
    @Volatile private var lastFetchMs: Long = 0L
    private val cacheTtlMs = 2 * 60 * 1000L

    @ReactMethod
    fun listSeries(forceRefresh: Boolean, promise: Promise) {
        scope.launch {
            val now = System.currentTimeMillis()
            val cached = lastSeries
            val followedIds = followedSeriesDao.getAllIds().toSet()
            if (!forceRefresh && cached.isNotEmpty() && (now - lastFetchMs) < cacheTtlMs) {
                promise.resolve(buildSeriesArray(cached, followedIds))
                return@launch
            }
            kavitaSeriesFeature.listSeries()
                .onSuccess { series ->
                    lastSeries = series
                    lastFetchMs = System.currentTimeMillis()
                    promise.resolve(buildSeriesArray(series, followedIds))
                }
                .onFailure { promise.reject("LIBRARY_ERROR", it.message, it) }
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
    fun syncBff(promise: Promise) {
        scope.launch {
            bffFeature.syncBff(lastSeries)
                .onSuccess { promise.resolve(null) }
                .onFailure { promise.reject("BFF_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun saveReadingProgress(chapterId: String, seriesId: String, page: Int, promise: Promise) {
        scope.launch {
            kavitaSeriesFeature.saveReadingProgress(chapterId, seriesId, page)
                .onSuccess { promise.resolve(null) }
                .onFailure { promise.reject("PROGRESS_ERROR", it.message, it) }
        }
    }

    private fun buildSeriesArray(series: List<SeriesSummary>, followedIds: Set<String>) =
        Arguments.createArray().also { array ->
            series.forEach { s ->
                Arguments.createMap().apply {
                    putInt("id", s.id)
                    putString("name", s.name)
                    putString("coverUrl", s.coverUrl)
                    putString("readStatus", s.readStatus)
                    putDouble("progressFraction", s.progressFraction.toDouble())
                    putInt("pagesRead", s.pagesRead)
                    putInt("totalPages", s.totalPages)
                    s.lastChapterAddedUtc?.let { putString("lastChapterAddedUtc", it) }
                    s.downloadedChapters?.let { putInt("downloadedChapters", it) }
                    s.totalChapters?.let { putInt("totalChapters", it) }
                    s.latestChapterLabel?.let { putString("latestChapterLabel", it) }
                    putString("publicationStatus", s.publicationStatus)
                    putBoolean("hasErrors", s.hasErrors)
                    putBoolean("isFollowed", followedIds.contains(s.id.toString()))
                }.also { array.pushMap(it) }
            }
        }
}
