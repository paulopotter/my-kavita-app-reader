package com.mymangareader.tools.bridge

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever

class ConfigRepositoryTest {

    private fun makeStore(): ConfigStore =
        ConfigStore(FakeServerConfigDao(), FakeAuthConfigDao(), FakeUiPreferencesDao(), FakeBffServerConfigDao())

    private fun makeModule(store: ConfigStore = makeStore()): ConfigRepository {
        val context = mock<ReactApplicationContext>()
        return ConfigRepository(store, context)
    }

    private fun readableMapOf(vararg entries: Pair<String, Any?>): ReadableMap {
        val map = mock<ReadableMap>()
        val byKey = entries.toMap()
        whenever(map.hasKey(any())).thenAnswer { inv -> byKey.containsKey(inv.getArgument(0)) }
        whenever(map.getString(any())).thenAnswer { inv -> byKey[inv.getArgument(0) as String] as String? }
        return map
    }

    @Test
    fun `getName retorna ConfigRepository`() {
        assertEquals("ConfigRepository", makeModule().name)
    }

    // getUiPreferences/getServerConfigs/getAuthConfig usam Arguments.createMap()/createArray()
    // (com.facebook.react.bridge), que exigem a lib nativa reactnativejni — indisponível mesmo sob
    // Robolectric (Arguments não tem um shadow do RN; mesma limitação documentada em
    // ReaderChapterModuleTest.kt). Cobertos indiretamente pelos testes de upsertUiPreferences em
    // ConfigRepositoryRobolectricTest, que não passam por Arguments, e por smoke test manual em
    // dispositivo físico.

    @Test
    fun `getAuthConfig resolve nulo quando nao ha auth salva`() = runTest {
        val module = makeModule()
        val promise = FakePromise()

        module.getAuthConfig(promise)
        promise.awaitResolved()

        assertNull(promise.resolvedValue)
        assertNull(promise.rejectedCode)
    }
}
