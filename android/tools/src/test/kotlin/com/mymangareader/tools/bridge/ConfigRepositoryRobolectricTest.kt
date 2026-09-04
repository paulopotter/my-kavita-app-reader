package com.mymangareader.tools.bridge

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.ReactApplicationContext
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// UiThreadUtil.runOnUiThread (chamado por applyAppLocale) posta no Looper principal — precisa de
// Robolectric pra rodar de fato num teste JVM, mesmo padrão de ScreenControlModuleRobolectricTest.
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class ConfigRepositoryRobolectricTest {
    private fun makeModule(store: ConfigStore = ConfigStore(FakeServerConfigDao(), FakeAuthConfigDao(), FakeBffServerConfigDao())): ConfigRepository {
        val realApp = ApplicationProvider.getApplicationContext<Application>()
        val context: ReactApplicationContext = mock()
        whenever(context.getSystemService(any<Class<*>>())).thenAnswer { inv -> realApp.getSystemService(inv.getArgument(0)) }
        return ConfigRepository(store, context)
    }

    @Test
    fun `getAppLocale resolve sempre um dos tags suportados, sem lancar`() =
        runTest {
            val module = makeModule()
            val promise = FakePromise()

            module.getAppLocale(promise)
            promise.awaitResolved()

            // Robolectric's LocaleManager doesn't expose a real per-app override to drive here; the
            // contract this test pins is "always resolves, always one of the app's supported tags".
            assertNull(promise.rejectedCode)
            assertTrue(promise.resolvedValue == "pt-BR" || promise.resolvedValue == "en")
        }

    @Test
    fun `setAppLocale resolve sem lancar`() =
        runTest {
            val module = makeModule()
            val promise = FakePromise()

            module.setAppLocale("en", promise)
            promise.awaitResolved()

            assertNull(promise.rejectedCode)
        }
}
