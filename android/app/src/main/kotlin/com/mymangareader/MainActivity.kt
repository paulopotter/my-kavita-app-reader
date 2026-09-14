package com.mymangareader

import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.net.Uri
import android.os.Bundle
import android.os.SystemClock
import android.util.Log
import androidx.appcompat.app.AlertDialog
import androidx.core.net.toUri
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.lifecycleScope
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.mymangareader.tools.ota.OtaDecision
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

private const val PREFS_NAME = "app_lifecycle"
private const val KEY_LAST_STOPPED_AT_MS = "last_stopped_at_ms"
private const val KEY_CONSUMED_DEEPLINK_TAP_IDS = "consumed_deeplink_tap_ids"
// Small cap on the persisted set — a tap id is only ever needed once (to reject a stale re-delivery
// of the same Intent), so nothing is lost by not keeping history forever. Prevents this from
// growing unbounded across a long-lived install.
private const val MAX_REMEMBERED_TAP_IDS = 20
private const val TAG = "MainActivity"

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

    override fun createReactActivityDelegate(): ReactActivityDelegate = DefaultReactActivityDelegate(this, mainComponentName, false)

    // RN's own Linking module does NOT read the URI off getIntent() the way the doc used to
    // assume — confirmed by decompiling react-android 0.75.4: ReactActivity.onNewIntent(intent)
    // → ReactActivityDelegate → ReactDelegate → ReactInstanceManager.onNewIntent(intent) all pass
    // the raw `intent` PARAMETER straight through, and ReactInstanceManager reads
    // `intent.getData()` off that same parameter to call
    // DeviceEventManagerModule.emitNewIntentReceived(uri) — the event React Navigation's `linking`
    // prop listens for. getIntent() overriding this Activity's own accessor never enters that path
    // at all for a warm link (already-running app, notification tapped) — only IntentModule
    // .getInitialURL() (a cold start) actually calls getIntent(). So the URI must be normalized
    // into the Intent BEFORE it's handed to super.onNewIntent()/setIntent(), not after.
    //
    // [resolveDeepLinkIntent] is the one place that normalizes a URI (`normalizeDeepLinkUri`) and
    // consumes a notification tap id at most once (`consumeDeepLinkTapId`, DeepLinkNormalizer.kt)
    // — called from both getIntent() (cold start) and onNewIntent() (already-running app), so
    // neither path can drift from the other again.
    //
    // A notification's PendingIntent carries EXTRA_DEEPLINK_TAP_ID (NotificationDisplay), a fresh
    // id per tap. The OS can hand the same Intent back on a later, unrelated launch — reopening
    // from the launcher icon, or from the recents list — even after the process was killed, since
    // the Intent that originally started the Activity is what the OS replays (there is no second
    // "real" tap in that case). The persisted SharedPreferences set (not just in-memory) is what
    // rejects that replay. An Intent with no tap id (any non-notification launch) is never
    // touched here.
    override fun getIntent(): Intent = resolveDeepLinkIntent(super.getIntent(), source = "getIntent")

    override fun onNewIntent(intent: Intent) {
        val resolved = resolveDeepLinkIntent(intent, source = "onNewIntent")
        super.onNewIntent(resolved)
        setIntent(resolved)
    }

    // Idempotent per Intent identity — repeated calls for the exact same Intent instance (which
    // getIntent() legitimately receives many times over the Activity's life) return the cached
    // result instead of re-consulting (and re-rejecting against) the persisted consumed-set.
    private var lastSeenIntent: Intent? = null
    private var lastResolvedIntent: Intent? = null

    private fun resolveDeepLinkIntent(
        original: Intent,
        source: String,
    ): Intent {
        if (original === lastSeenIntent) {
            return lastResolvedIntent ?: original
        }
        lastSeenIntent = original
        lastResolvedIntent = null

        // ACTION_SEND (the "Share" sheet workaround — see AndroidManifest.xml's own doc on it)
        // carries the URL as free-form EXTRA_TEXT, never as Intent.data the way a tapped
        // ACTION_VIEW link does — everything below this treats both the same from here on.
        val rawUri =
            if (original.action == Intent.ACTION_SEND) {
                extractSharedUrl(original.getStringExtra(Intent.EXTRA_TEXT))
            } else {
                original.data?.toString()
            } ?: return original
        val tapId = original.getStringExtra(EXTRA_DEEPLINK_TAP_ID)

        if (tapId != null && !rememberDeepLinkTap(tapId)) {
            Log.w(TAG, "$source() — tapId=$tapId already consumed (stale Intent replay, e.g. reopened from icon/recents) — deep link not honored")
            return original
        }

        val normalized = normalizeDeepLinkUri(rawUri) ?: return original
        Log.i(TAG, "$source() — rawUri=$rawUri tapId=$tapId -> normalized=$normalized")
        // ACTION_SEND itself is rewritten to ACTION_VIEW here — everything downstream (RN's
        // Linking module, ReactInstanceManager.onNewIntent, see this function's own doc) only
        // ever recognizes ACTION_VIEW; a resolved Intent still carrying ACTION_SEND would have
        // its `data` read correctly by the code above but never reach React Navigation.
        val resolved =
            Intent(original).apply {
                action = Intent.ACTION_VIEW
                data = Uri.parse(normalized)
            }
        lastResolvedIntent = resolved
        return resolved
    }

    // Returns true the first time this tap id is seen; false (with the tap rejected) on every
    // subsequent call for the same id. The actual set/cap arithmetic is consumeDeepLinkTapId
    // (DeepLinkNormalizer.kt) — pure and unit-testable on its own; this just wires it to
    // SharedPreferences, since "kill the process, reopen from the icon" (the case being guarded
    // against) must survive across process restarts, not just in-memory state.
    private fun rememberDeepLinkTap(tapId: String): Boolean {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        // getStringSet's contract requires never mutating the returned Set — consumeDeepLinkTapId
        // only ever reads it and returns a fresh Set, never touches this one in place.
        val alreadyConsumed = prefs.getStringSet(KEY_CONSUMED_DEEPLINK_TAP_IDS, emptySet()) ?: emptySet()
        val result = consumeDeepLinkTapId(tapId, alreadyConsumed, MAX_REMEMBERED_TAP_IDS)
        prefs.edit().putStringSet(KEY_CONSUMED_DEEPLINK_TAP_IDS, result.consumed).apply()
        return result.wasFirstSeen
    }

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
        // Pass null, not savedInstanceState — react-native-screens' fragments must never be
        // restored by the platform (they'd crash with "Screen fragments should never be
        // restored"). RN rebuilds the whole view tree from JS anyway, so there's nothing of ours
        // worth restoring here. This matters on any Activity recreate: rotation, and — the one
        // that bit us — an in-app language change that flips the locale.
        super.onCreate(null)

        val app = application as MainApplication
        lifecycleScope.launch {
            // Suspends until MainApplication's check() completes (usually already done by now).
            when (val decision = app.bootGate.first { it != null }!!) {
                is OtaDecision.Blocked -> {
                    // Release the system splash (holding it forever risks an ANR on some launchers)
                    // and show a non-cancelable native dialog — the user can only tap "download".
                    // Also publish the policy so the RN splash freezes underneath (no progress, no
                    // redirect): a redundant second barrier in case the native dialog is somehow
                    // dismissed. The RN splash does NOT draw its own `required` alert on top of
                    // this one (see useSplash) — it just stops.
                    OtaEventBridge.pendingPolicy = "required" to decision.releaseNotesUrl
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
        AlertDialog
            .Builder(this)
            .setTitle("Atualização obrigatória")
            .setMessage("Esta versão do app não é mais suportada. Atualize para continuar.")
            .setCancelable(false)
            .setPositiveButton("Baixar atualização") { _, _ ->
                startActivity(Intent(Intent.ACTION_VIEW, releaseNotesUrl.toUri()))
            }.show()
    }

    // The Activity handles `locale` in its configChanges (AndroidManifest), so an in-Settings
    // language change lands here instead of recreating the Activity. Tell JS so App.tsx re-reads
    // the effective locale and re-renders — no restart needed. RN itself doesn't need the
    // newConfig; it re-queries via the ConfigRepository bridge.
    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        (application as? MainApplication)
            ?.reactNativeHost
            ?.reactInstanceManager
            ?.currentReactContext
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit("appLocaleChanged", null)
    }

    // Strip the fragment/view hierarchy the platform would otherwise try to save and restore —
    // react-native-screens can't survive that (see the null in onCreate). RN restores nothing
    // from a Bundle; it rebuilds from JS.
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.remove("android:support:fragments")
        outState.remove("androidx.lifecycle.BundlableSavedStateRegistry.key")
    }

    override fun onStop() {
        super.onStop()
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_LAST_STOPPED_AT_MS, System.currentTimeMillis())
            .apply()
    }

    companion object {
        const val EXTRA_DEEPLINK_TAP_ID = "deeplink_tap_id"
    }
}
