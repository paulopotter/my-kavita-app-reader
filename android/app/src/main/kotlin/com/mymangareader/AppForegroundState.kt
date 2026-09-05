package com.mymangareader

import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Whether at least one Activity of this process is currently in the foreground — the whole
 * process's lifecycle (`ProcessLifecycleOwner`), not a specific Activity's. Registered once, in
 * `MainApplication.onCreate()`, and read from anywhere that needs to decide "is the user looking
 * at the app right now" without depending on RN being alive (e.g. `NotificationDisplay`, running
 * on the foreground service's hot path, decides whether to post a system-tray notification or
 * only update history/badge based on this).
 *
 * Deliberately separate from `MainActivity`'s own `last_stopped_at_ms` (the OTA stable-boot gate)
 * — that value answers "how long since the app was last stopped", not "is it in the foreground
 * this instant", and mixing the two would give the OTA gate a second, unrelated meaning.
 */
object AppForegroundState {
    private val _isForeground = MutableStateFlow(false)
    val isForeground: StateFlow<Boolean> = _isForeground

    // A named (not anonymous) observer — lets a test drive onStart/onStop directly without
    // depending on ProcessLifecycleOwner's own dispatch actually firing under Robolectric.
    internal val observer =
        object : DefaultLifecycleObserver {
            override fun onStart(owner: LifecycleOwner) {
                _isForeground.value = true
            }

            override fun onStop(owner: LifecycleOwner) {
                _isForeground.value = false
            }
        }

    fun register() {
        ProcessLifecycleOwner.get().lifecycle.addObserver(observer)
    }
}
