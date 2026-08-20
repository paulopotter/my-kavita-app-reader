package com.mymangareader.tools.bridge

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
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
    fun `upsertUiPreferences com language aplica o locale e persiste sem lancar excecao`() = runTest {
        val store = ConfigStore(FakeServerConfigDao(), FakeAuthConfigDao(), FakeUiPreferencesDao(), FakeBffServerConfigDao())
        val module = makeModule(store)
        val promise = FakePromise()

        module.upsertUiPreferences(readableMapOf("language" to "en"), promise)
        promise.awaitResolved()

        assertNull(promise.rejectedCode)
        assertEquals("en", store.getUiPreferences().language)
    }

    @Test
    fun `upsertUiPreferences sem language nao tenta aplicar locale e resolve normalmente`() = runTest {
        val module = makeModule()
        val promise = FakePromise()

        module.upsertUiPreferences(readableMapOf(), promise)
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
