package com.mymangareader

import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.mymangareader.tools.ota.OtaStore
import javax.inject.Inject

private const val EVENT_BUNDLE_READY = "otaBundleReady"

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

    // Called from Kotlin when a new bundle finishes downloading after MainActivity is open.
    @ReactMethod
    fun addListener(eventName: String) = Unit  // required by RN event emitter contract

    @ReactMethod
    fun removeListeners(count: Int) = Unit     // required by RN event emitter contract

    // RN → Kotlin: user confirmed update; restart app from SplashActivity.
    @ReactMethod
    fun applyOtaUpdate() {
        val context = reactApplicationContext
        val intent = Intent(context, SplashActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        context.startActivity(intent)
    }

    companion object {
        private var instance: OtaEventBridge? = null

        fun register(bridge: OtaEventBridge) { instance = bridge }

        fun notifyBundleReady() {
            instance?.reactApplicationContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(EVENT_BUNDLE_READY, null)
        }
    }
}
