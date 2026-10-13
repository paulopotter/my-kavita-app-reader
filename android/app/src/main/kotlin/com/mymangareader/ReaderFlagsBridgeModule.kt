package com.mymangareader

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.mymangareader.features.kavita.reader.ui.ReaderDebugFlags
import com.mymangareader.preferences.Preferences
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

// RN→Kotlin bridge for the reader's debug-menu flags (today: the decoded-page size budget). The
// value lives in ReaderDebugFlags (read by the decoder at every decode) and is persisted in
// Preferences so it survives a restart — MainApplication re-applies it at start. Never adds
// decisions of its own: the allowed range is ReaderDebugFlags' own.
class ReaderFlagsBridgeModule(
    private val preferences: Preferences,
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {
    override fun getName(): String = "ReaderFlagsBridgeModule"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    @ReactMethod
    fun getPageBudgetMb(promise: Promise) {
        promise.resolve(ReaderDebugFlags.pageBudgetMb)
    }

    @ReactMethod
    fun setPageBudgetMb(
        mb: Int,
        promise: Promise,
    ) {
        scope.launch {
            runCatching {
                ReaderDebugFlags.pageBudgetMb = mb
                val applied = ReaderDebugFlags.pageBudgetMb
                preferences.put(PAGE_BUDGET_PREF_KEY, applied.toString(), PAGE_BUDGET_PREF_DOMAIN)
                applied
            }.resolveOrReject(promise, "READER_FLAGS_SET_PAGE_BUDGET_ERROR")
        }
    }

    companion object {
        // Prefixed: a preference's identity is only its key, so an unprefixed name could collide.
        const val PAGE_BUDGET_PREF_KEY = "reader.debug.pageBudgetMb"
        const val PAGE_BUDGET_PREF_DOMAIN = "debug"
    }
}
