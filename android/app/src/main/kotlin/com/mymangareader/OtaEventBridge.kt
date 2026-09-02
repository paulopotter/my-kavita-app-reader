package com.mymangareader

import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.mymangareader.tools.ota.OtaStore
import javax.inject.Inject

private const val EVENT_BUNDLE_READY = "otaBundleReady"
private const val EVENT_DOWNLOAD_PROGRESS = "otaDownloadProgress"

class OtaEventBridge(
    context: ReactApplicationContext,
    private val otaStore: OtaStore,
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "OtaEventBridge"

    // Returns the three app versions so the RN side can display them.
    @ReactMethod
    fun getVersions(promise: Promise) {
        val rnVersion = otaStore.readState().currentBundleVersion.ifBlank { BuildConfig.RN_VERSION }
        val map = Arguments.createMap().apply {
            putString("app", BuildConfig.APP_BUILD_DATETIME)
            putString("backend", BuildConfig.KOTLIN_VERSION_NAME)
            putString("frontend", rnVersion)
        }
        promise.resolve(map)
    }

    // Returns the OTA advisory policy MainActivity picked up from check(), or null if none.
    // mode: "required" | "highly_recommended" | "recommended" | null
    @ReactMethod
    fun getOtaPolicy(promise: Promise) {
        val (mode, url) = pendingPolicy ?: run { promise.resolve(null); return }
        val map = Arguments.createMap().apply {
            putString("mode", mode)
            putString("releaseNotesUrl", url)
        }
        promise.resolve(map)
    }

    // Pull snapshot of the background-download state, so the RN splash sees where the download got
    // to even if it finished (or started) before the splash mounted and could subscribe to
    // otaDownloadProgress. { phase: "idle"|"downloading"|"ready"|"failed", progress: -1..1,
    // policy: {mode, releaseNotesUrl} | null }.
    @ReactMethod
    fun getOtaState(promise: Promise) {
        val map = Arguments.createMap().apply {
            putString("phase", downloadPhase)
            putDouble("progress", downloadProgress.toDouble())
            val policy = pendingPolicy
            if (policy == null) {
                putNull("policy")
            } else {
                putMap(
                    "policy",
                    Arguments.createMap().apply {
                        putString("mode", policy.first)
                        putString("releaseNotesUrl", policy.second)
                    },
                )
            }
        }
        promise.resolve(map)
    }

    // Called by RN when user dismisses the advisory/blocking dialog.
    // Clears the pending policy so it won't appear again this session.
    @ReactMethod
    fun acknowledgePolicy(promise: Promise) {
        pendingPolicy = null
        promise.resolve(null)
    }

    @ReactMethod
    fun addListener(eventName: String) = Unit  // required by RN event emitter contract

    @ReactMethod
    fun removeListeners(count: Int) = Unit     // required by RN event emitter contract

    // RN → Kotlin: user confirmed update; restart the app so MainApplication re-runs the OTA gate
    // and getJSBundleFile() picks up the freshly downloaded bundle.
    @ReactMethod
    fun applyOtaUpdate() {
        val context = reactApplicationContext
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        context.startActivity(intent)
    }

    companion object {
        private var instance: OtaEventBridge? = null

        // Set by MainActivity from the resolved OtaDecision's advisory.
        // Pair(mode, releaseNotesUrl). Null means no advisory policy active.
        @Volatile var pendingPolicy: Pair<String, String>? = null

        // Last-known background-download state. Written by MainApplication.startOtaDownload(),
        // read back by getOtaState() for a splash that mounts mid/post-download.
        @Volatile var downloadPhase: String = "idle"
        @Volatile var downloadProgress: Float = -1f

        fun register(bridge: OtaEventBridge) { instance = bridge }

        fun markDownloadStarted() {
            downloadPhase = "downloading"
            downloadProgress = -1f
        }

        fun notifyDownloadProgress(phase: String, progress: Float) {
            downloadPhase = phase
            downloadProgress = progress
            val context = instance?.reactApplicationContext ?: return
            val map = Arguments.createMap().apply {
                putString("phase", phase)
                putDouble("progress", progress.toDouble())
            }
            context.emitEvent(EVENT_DOWNLOAD_PROGRESS, map)
        }

        fun notifyBundleReady() {
            val context = instance?.reactApplicationContext ?: return
            context.emitEvent(EVENT_BUNDLE_READY, null)
        }
    }
}
