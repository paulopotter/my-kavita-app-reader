package com.mymangareader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.mymangareader.features.kavita.ActiveUrlWatcher
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

private const val EVENT_ACTIVE_URL_CHANGED = "activeUrlChanged"

// Generic network/server-selection status stream — not reader-specific. Any screen that needs
// to know which Kavita mirror is currently active can subscribe to this event.
@Singleton
class NetworkStatusModule @Inject constructor(
    private val activeUrlWatcher: ActiveUrlWatcher,
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "NetworkStatusModule"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    init {
        activeUrlWatcher.start(scope)
        scope.launch {
            activeUrlWatcher.activeUrl.collect { url ->
                if (url == null) return@collect
                val map = Arguments.createMap().apply { putString("url", url) }
                reactApplicationContext.emitEvent(EVENT_ACTIVE_URL_CHANGED, map)
            }
        }
    }

    @ReactMethod
    fun addListener(eventName: String) = Unit // required by RN event emitter contract

    @ReactMethod
    fun removeListeners(count: Int) = Unit // required by RN event emitter contract
}
