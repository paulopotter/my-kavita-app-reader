package com.mymangareader

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.SystemClock
import androidx.appcompat.app.AlertDialog
import androidx.core.net.toUri
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.lifecycleScope
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.mymangareader.tools.ota.OtaDecision
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

private const val PREFS_NAME = "app_lifecycle"
private const val KEY_LAST_STOPPED_AT_MS = "last_stopped_at_ms"

// The native system splash is held until BOTH the OTA gate has resolved AND the RN splash has
// mounted (StartupModule.markUiReady), or this many ms elapse — whichever comes first. The
// timeout is a safety net for a JS hang; in the normal case markUiReady lands well under it.
private const val SPLASH_MAX_HOLD_MS = 4_000L

// MainActivity is the launcher — there is no SplashActivity anymore. The Android 12 SplashScreen
// API (androidx.core:core-splashscreen, backported) keeps the OS-drawn splash on screen until the
// RN splash is painted, so nothing intermediate is ever visible: the system splash hands straight
// over to the RN splash. The OTA gate (check + rollback + stable-boot timer + background download)
// runs in MainApplication; this Activity reacts to its result and to the RN-ready signal.
@AndroidEntryPoint
class MainActivity : ReactActivity() {

    @Volatile private var gateResolved = false
    private val startedAtMs = SystemClock.elapsedRealtime()

    override fun getMainComponentName(): String = "mymangareader"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, false)

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        splashScreen.setKeepOnScreenCondition {
            val elapsed = SystemClock.elapsedRealtime() - startedAtMs
            if (elapsed >= SPLASH_MAX_HOLD_MS) {
                false
            } else {
                !gateResolved || !BootUiReadySignal.ready.value
            }
        }
        super.onCreate(savedInstanceState)

        val app = application as MainApplication
        lifecycleScope.launch {
            // Suspends until MainApplication's check() completes (usually already done by now).
            when (val decision = app.bootGate.first { it != null }!!) {
                is OtaDecision.Blocked -> {
                    // Release the system splash (holding it forever risks an ANR on some launchers)
                    // and show a non-cancelable dialog over the RN content — the user can only tap
                    // "download", same as the old SplashActivity block screen.
                    gateResolved = true
                    showBlockedDialog(decision.releaseNotesUrl)
                }
                is OtaDecision.DownloadPending -> {
                    decision.advisory?.let {
                        OtaEventBridge.pendingPolicy = it.mode to it.releaseNotesUrl
                    }
                    app.startOtaDownload(decision)
                    gateResolved = true
                }
                is OtaDecision.NothingToDo -> {
                    decision.advisory?.let {
                        OtaEventBridge.pendingPolicy = it.mode to it.releaseNotesUrl
                    }
                    gateResolved = true
                }
                is OtaDecision.Failed -> gateResolved = true
            }
        }
    }

    private fun showBlockedDialog(releaseNotesUrl: String) {
        AlertDialog.Builder(this)
            .setTitle("Atualização obrigatória")
            .setMessage("Esta versão do app não é mais suportada. Atualize para continuar.")
            .setCancelable(false)
            .setPositiveButton("Baixar atualização") { _, _ ->
                startActivity(Intent(Intent.ACTION_VIEW, releaseNotesUrl.toUri()))
            }
            .show()
    }

    override fun onStop() {
        super.onStop()
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_LAST_STOPPED_AT_MS, System.currentTimeMillis())
            .apply()
    }
}
