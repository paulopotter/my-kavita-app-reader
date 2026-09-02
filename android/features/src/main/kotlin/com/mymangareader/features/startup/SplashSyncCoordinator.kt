package com.mymangareader.features.startup

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

// SplashSyncCoordinator — no longer does any work (plano 017, Task 028).
//
// It used to, on the RN splash: (a) list every series via KavitaSeriesFeature.listSeries(),
// (b) feed that list to BffFeature.syncBff() to refresh the BFF match table, and (c) loop the
// followed series populating chapterCacheDao. All three are gone:
//   - (c) chapterCacheDao is no longer read by any live screen — the Library, Serie and Reader
//     rewrites all go through :content-digest / :server, which have their own cache.
//   - (b) the BFF sync now happens on the RN side (SerialsService.externalDetails.sync, driven
//     by the Library's own load flow) — Kotlin no longer orchestrates it.
//   - (a) only existed to feed (b) and (c).
//
// sync() is kept as a no-op so StartupModule.syncBlocking/syncInBackground (and the RN
// StartupBridge calls) still resolve. Removing those methods and having the RN splash drive the
// Library warm-up directly is the Splash refactor task, deliberately out of scope here.
@Singleton
class SplashSyncCoordinator @Inject constructor() {
    private val _progress = MutableStateFlow(0f)
    val progress: StateFlow<Float> = _progress

    suspend fun sync(): Boolean {
        _progress.value = 1f
        return true
    }
}
