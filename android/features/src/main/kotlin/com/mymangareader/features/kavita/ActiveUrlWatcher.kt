package com.mymangareader.features.kavita

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

private const val POLL_INTERVAL_MS = 30_000L

@Singleton
class ActiveUrlWatcher @Inject constructor(
    private val urlSource: KavitaUrlSource,
) {
    private val _activeUrl = MutableStateFlow<String?>(null)
    val activeUrl: StateFlow<String?> = _activeUrl.asStateFlow()
    private var pollJob: Job? = null

    fun start(scope: CoroutineScope) {
        if (pollJob != null) return
        pollJob = scope.launch {
            while (isActive) {
                val current = urlSource.getActiveUrl().getOrNull()
                if (current != null && current != _activeUrl.value) _activeUrl.value = current
                delay(POLL_INTERVAL_MS)
            }
        }
    }
}
