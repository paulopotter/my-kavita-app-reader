package com.mymangareader.tools.bridge

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
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

    private fun makeModule(store: ConfigStore = ConfigStore(FakeServerConfigDao(), FakeAuthConfigDao(), FakeUiPreferencesDao(), FakeBffServerConfigDao())): ConfigRepository {
        val realApp = ApplicationProvider.getApplicationContext<Application>()
        val context: ReactApplicationContext = mock()
        whenever(context.getSystemService(any<Class<*>>())).thenAnswer { inv -> realApp.getSystemService(inv.getArgument(0)) }
        return ConfigRepository(store, context)
    }

    private fun readableMapOf(vararg entries: Pair<String, Any?>): ReadableMap {
        val map = mock<ReadableMap>()
        val byKey = entries.toMap()
        whenever(map.hasKey(any())).thenAnswer { inv -> byKey.containsKey(inv.getArgument(0)) }
        whenever(map.getString(any())).thenAnswer { inv -> byKey[inv.getArgument(0) as String] as String? }
        whenever(map.getBoolean(any())).thenAnswer { inv -> byKey[inv.getArgument(0) as String] as Boolean }
        return map
    }

    @Test
    fun `upsertUiPreferences ignora um campo language e nao persiste nada de idioma`() = runTest {
        val store = ConfigStore(FakeServerConfigDao(), FakeAuthConfigDao(), FakeUiPreferencesDao(), FakeBffServerConfigDao())
        val module = makeModule(store)
        val promise = FakePromise()

        // The UI language is the OS per-app locale now — a "language" key here is a no-op.
        module.upsertUiPreferences(readableMapOf("language" to "en"), promise)
        promise.awaitResolved()

        assertNull(promise.rejectedCode)
        assertEquals("pt-BR", store.getUiPreferences().language) // untouched default
    }

    @Test
    fun `getAppLocale resolve sempre um dos tags suportados, sem lancar`() = runTest {
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
    fun `setAppLocale resolve sem lancar`() = runTest {
        val module = makeModule()
        val promise = FakePromise()

        module.setAppLocale("en", promise)
        promise.awaitResolved()

        assertNull(promise.rejectedCode)
    }

    // Regressão: getUiPreferences/upsertUiPreferences tinham o campo immersiveModeDuringReading
    // adicionado à UiPreferencesEntity/Dao mas nunca lido/gravado aqui — o switch de modo imersivo
    // em Configurações sempre recebia `undefined`, então nunca alternava visualmente.
    @Test
    fun `upsertUiPreferences com immersiveModeDuringReading persiste o valor`() = runTest {
        val store = ConfigStore(FakeServerConfigDao(), FakeAuthConfigDao(), FakeUiPreferencesDao(), FakeBffServerConfigDao())
        val module = makeModule(store)
        val promise = FakePromise()

        module.upsertUiPreferences(readableMapOf("immersiveModeDuringReading" to true), promise)
        promise.awaitResolved()

        assertNull(promise.rejectedCode)
        assertEquals(true, store.getUiPreferences().immersiveModeDuringReading)
    }

    @Test
    fun `upsertUiPreferences sem immersiveModeDuringReading preserva o valor anterior`() = runTest {
        val store = ConfigStore(FakeServerConfigDao(), FakeAuthConfigDao(), FakeUiPreferencesDao(), FakeBffServerConfigDao())
        store.upsertUiPreferences { copy(immersiveModeDuringReading = true) }
        val module = makeModule(store)
        val promise = FakePromise()

        module.upsertUiPreferences(readableMapOf("language" to "en"), promise)
        promise.awaitResolved()

        assertEquals(true, store.getUiPreferences().immersiveModeDuringReading)
    }
}
