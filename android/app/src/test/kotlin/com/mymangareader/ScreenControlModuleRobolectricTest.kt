package com.mymangareader

import android.app.Activity
import android.view.WindowInsets
import android.view.WindowManager
import androidx.core.view.WindowInsetsCompat
import com.facebook.react.bridge.ReactApplicationContext
import org.junit.Assert.assertEquals
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

    @Test
    fun `setImmersiveMode true resolve a promise sem lancar excecao`() {
        val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
        val module = makeModule(activity)
        val promise = FakePromise()

        module.setImmersiveMode(true, promise)
        shadowOf(activity.mainLooper).idle()

        promise.awaitResolved()
    }

    @Test
    fun `setImmersiveMode false apos true resolve a promise sem lancar excecao`() {
        val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
        val module = makeModule(activity)
        module.setImmersiveMode(true, FakePromise())
        shadowOf(activity.mainLooper).idle()
        val promise = FakePromise()

        module.setImmersiveMode(false, promise)
        shadowOf(activity.mainLooper).idle()

        promise.awaitResolved()
    }

    @Test
    fun `zeroOutSystemBarsInsets zera os insets de system bars mantendo os demais`() {
        val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
        val simulatedInsets = android.graphics.Insets.of(0, 84, 0, 0)
        val incoming = WindowInsets.Builder()
            .setInsets(WindowInsets.Type.statusBars(), simulatedInsets)
            .build()

        val result = ScreenControlModule.zeroOutSystemBarsInsets(activity.window.decorView, incoming)
        val resultCompat = WindowInsetsCompat.toWindowInsetsCompat(result, activity.window.decorView)

        assertEquals(0, resultCompat.getInsets(WindowInsetsCompat.Type.systemBars()).top)
    }

    @Test
    fun `setImmersiveMode true seguido de false resolve ambas as promises sem lancar excecao`() {
        // Regressão: setOnApplyWindowInsetsListener(null) ao desativar NÃO restaura o
        // comportamento padrão da DecorView (confirmado experimentalmente) — precisa sempre haver
        // um listener instalado, mesmo que ele só deixe os insets passarem sem modificação.
        val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
        val module = makeModule(activity)
        val enablePromise = FakePromise()
        val disablePromise = FakePromise()

        module.setImmersiveMode(true, enablePromise)
        shadowOf(activity.mainLooper).idle()
        module.setImmersiveMode(false, disablePromise)
        shadowOf(activity.mainLooper).idle()

        enablePromise.awaitResolved()
        disablePromise.awaitResolved()
    }

    private fun hasFlag(activity: Activity, flag: Int): Boolean =
        (activity.window.attributes.flags and flag) != 0
}
