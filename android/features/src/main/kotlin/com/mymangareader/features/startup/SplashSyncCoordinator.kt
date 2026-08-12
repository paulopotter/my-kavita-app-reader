package com.mymangareader.features.startup

import com.mymangareader.core.database.ChapterCacheDao
import com.mymangareader.core.database.FollowedSeriesDao
import com.mymangareader.core.database.UiPreferencesDao
import com.mymangareader.features.bff.BffFeature
import com.mymangareader.features.kavita.KavitaSeriesFeature
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withTimeoutOrNull

private const val SYNC_BUDGET_MS = 30_000L
private const val RECENT_SYNC_WINDOW_MS = 5 * 60 * 1000L

@Singleton
class SplashSyncCoordinator @Inject constructor(
    private val kavitaSeriesFeature: KavitaSeriesFeature,
    private val bffFeature: BffFeature,
    private val followedSeriesDao: FollowedSeriesDao,
    private val chapterCacheDao: ChapterCacheDao,
    private val uiPreferencesDao: UiPreferencesDao,
) {
    private val _progress = MutableStateFlow(0f)
    val progress: StateFlow<Float> = _progress

    suspend fun sync(): Boolean {
        _progress.value = 0f

        val prefs = uiPreferencesDao.get()
        val lastSync = prefs?.lastSuccessfulSyncAtMs
        if (lastSync != null && (System.currentTimeMillis() - lastSync) < RECENT_SYNC_WINDOW_MS) {
            _progress.value = 0.9f
            return true
        }

        val completed = withTimeoutOrNull(SYNC_BUDGET_MS) {
            val seriesResult = kavitaSeriesFeature.listSeries()
            val series = seriesResult.getOrNull()
            _progress.value = 0.3f

            if (series != null) {
                runCatching { bffFeature.syncBff(series) }
            }
            _progress.value = 0.6f

            val followedIds = runCatching { followedSeriesDao.getAllIds() }.getOrElse { emptyList() }
            for (seriesId in followedIds) {
                runCatching {
                    val chapters = kavitaSeriesFeature.listChaptersForSeries(seriesId).getOrNull()
                    if (chapters != null) {
                        chapterCacheDao.deleteBySeriesId(seriesId)
                        chapterCacheDao.insertAll(chapters)
                    }
                }
            }
            _progress.value = 0.9f
            true
        }

        val success = completed == true
        if (success) {
            val current = prefs ?: com.mymangareader.core.database.UiPreferencesEntity()
            uiPreferencesDao.upsert(current.copy(lastSuccessfulSyncAtMs = System.currentTimeMillis()))
        }
        return success
    }
}
