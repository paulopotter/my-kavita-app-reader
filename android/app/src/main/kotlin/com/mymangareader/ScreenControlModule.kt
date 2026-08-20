package com.mymangareader

import android.view.WindowManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.mymangareader.core.database.UiPreferencesDao
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

// Generic Android screen-control primitives — not reader-specific, reusable by any screen that
// needs to keep the display awake (e.g. a future video/animation viewer). getKeepScreenOnDuringReading
// lives here (not in ReaderChapterModule) because it's a generic UiPreferencesDao read, same
// category as keepScreenOn/allowScreenOff — not chapter/page data.
@Singleton
class ScreenControlModule @Inject constructor(
    private val uiPreferencesDao: UiPreferencesDao,
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "ScreenControlModule"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    @ReactMethod
    fun keepScreenOn(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            currentActivity?.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun allowScreenOff(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            currentActivity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun getKeepScreenOnDuringReading(promise: Promise) {
        scope.launch {
            runCatching { uiPreferencesDao.getKeepScreenOnDuringReading() ?: true }.resolveOrReject(promise, "KEEP_SCREEN_ON_ERROR")
        }
    }
}
