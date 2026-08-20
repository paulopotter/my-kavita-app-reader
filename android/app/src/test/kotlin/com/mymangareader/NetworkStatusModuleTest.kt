package com.mymangareader

import com.facebook.react.bridge.ReactApplicationContext
import com.mymangareader.features.kavita.ActiveUrlWatcher
import com.mymangareader.features.kavita.KavitaUrlSource
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mockito.kotlin.mock

// getActiveUrl sempre falha para que o polling do ActiveUrlWatcher (disparado no init do
// NetworkStatusModule) nunca emita uma URL — isso evitaria o listener de activeUrlChanged chamar
// Arguments.createMap(), que exige a lib nativa reactnativejni indisponível em teste JVM puro.
private class FakeUrlSource : KavitaUrlSource {
    override suspend fun getActiveUrl(): Result<String> = Result.failure(IllegalStateException("no url in test"))
    override suspend fun invalidateAndReselect(): Result<String> = getActiveUrl()
    override fun getLastKnownUrl(): String? = null
}

class NetworkStatusModuleTest {

    private fun makeModule(): NetworkStatusModule {
        val context = mock<ReactApplicationContext>()
        val watcher = ActiveUrlWatcher(FakeUrlSource())
        return NetworkStatusModule(watcher, context)
    }

    @Test
    fun `getName retorna NetworkStatusModule`() {
        assertEquals("NetworkStatusModule", makeModule().name)
    }

    @Test
    fun `addListener e removeListeners nao lancam excecao`() {
        val module = makeModule()
        module.addListener("activeUrlChanged")
        module.removeListeners(1)
    }
}
