package com.mymangareader

import android.content.Context
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate
import dagger.hilt.android.AndroidEntryPoint

private const val PREFS_NAME = "app_lifecycle"
private const val KEY_LAST_STOPPED_AT_MS = "last_stopped_at_ms"

@AndroidEntryPoint
class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "mymangareader"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, false)

    override fun onStop() {
        super.onStop()
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_LAST_STOPPED_AT_MS, System.currentTimeMillis())
            .apply()
    }
}
