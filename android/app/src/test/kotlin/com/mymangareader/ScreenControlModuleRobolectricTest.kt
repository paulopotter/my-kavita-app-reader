package com.mymangareader

import android.app.Activity
import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

// UiThreadUtil.runOnUiThread posts to the main Looper — Robolectric's ShadowLooper lets a JVM
// test actually flush that queue and observe the resulting window flag, unlike a plain
// JUnit/Mockito test (see the removed JVM-only test's note in ScreenControlModuleTest.kt).
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class ScreenControlModuleRobolectricTest {

    private fun makeModule(activity: Activity): ScreenControlModule {
        val context: ReactApplicationContext = mock()
        whenever(context.currentActivity).thenReturn(activity)
        return ScreenControlModule(mock(), context)
    }

    @Test
    fun `keepScreenOn adiciona FLAG_KEEP_SCREEN_ON a janela da activity atual`() {
        val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
        val module = makeModule(activity)
        val promise = FakePromise()

        module.keepScreenOn(promise)
        shadowOf(activity.mainLooper).idle()

        assertTrue(hasFlag(activity, WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON))
    }

    @Test
    fun `allowScreenOff remove FLAG_KEEP_SCREEN_ON da janela da activity atual`() {
        val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
        activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val module = makeModule(activity)
        val promise = FakePromise()

        module.allowScreenOff(promise)
        shadowOf(activity.mainLooper).idle()

        assertFalse(hasFlag(activity, WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON))
    }

    private fun hasFlag(activity: Activity, flag: Int): Boolean =
        (activity.window.attributes.flags and flag) != 0
}
