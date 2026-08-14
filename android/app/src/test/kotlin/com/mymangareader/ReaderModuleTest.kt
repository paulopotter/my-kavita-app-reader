package com.mymangareader

import com.facebook.react.bridge.ReactApplicationContext
import com.mymangareader.core.database.UiPreferencesDao
import com.mymangareader.features.kavita.ActiveUrlWatcher
import com.mymangareader.features.kavita.KavitaUrlSource
import com.mymangareader.features.kavita.chapter.KavitaChapterFeature
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever

// getActiveUrl sempre falha para que o polling do ActiveUrlWatcher (disparado no init do
// ReaderModule) nunca emita uma URL — isso evitaria o listener de activeUrlChanged chamar
// Arguments.createMap(), que exige a lib nativa reactnativejni indisponível em teste JVM puro.
private class FakeUrlSource : KavitaUrlSource {
    override suspend fun getActiveUrl(): Result<String> = Result.failure(IllegalStateException("no url in test"))
    override suspend fun invalidateAndReselect(): Result<String> = getActiveUrl()
    override fun getLastKnownUrl(): String? = null
}

class ReaderModuleTest {

    private fun makeModule(
        feature: KavitaChapterFeature = mock(),
        uiPreferencesDao: UiPreferencesDao = mock(),
    ): ReaderModule {
        val context = mock<ReactApplicationContext>()
        val watcher = ActiveUrlWatcher(FakeUrlSource())
        return ReaderModule(feature, watcher, uiPreferencesDao, context)
    }

    @Test
    fun `getName retorna ReaderModule`() {
        assertEquals("ReaderModule", makeModule().name)
    }

    @Test
    fun `addListener e removeListeners nao lancam excecao`() {
        val module = makeModule()
        module.addListener("activeUrlChanged")
        module.removeListeners(1)
    }

    @Test
    fun `invalidatePageCache delega para KavitaChapterFeature`() = runTest {
        val feature: KavitaChapterFeature = mock()
        whenever(feature.invalidatePageCache("c1")).thenReturn(Result.success(Unit))
        val module = makeModule(feature = feature)
        val promise = FakePromise()

        module.invalidatePageCache("c1", promise)
        promise.awaitResolved()

        verify(feature).invalidatePageCache("c1")
        assertNull(promise.rejectedCode)
    }

    @Test
    fun `getKeepScreenOnDuringReading delega para UiPreferencesDao`() = runTest {
        val dao: UiPreferencesDao = mock()
        whenever(dao.getKeepScreenOnDuringReading()).thenReturn(false)
        val module = makeModule(uiPreferencesDao = dao)
        val promise = FakePromise()

        module.getKeepScreenOnDuringReading(promise)
        promise.awaitResolved()

        assertEquals(false, promise.resolvedValue)
    }

    @Test
    fun `getKeepScreenOnDuringReading usa true como padrao quando preferencia ausente`() = runTest {
        val dao: UiPreferencesDao = mock()
        whenever(dao.getKeepScreenOnDuringReading()).thenReturn(null)
        val module = makeModule(uiPreferencesDao = dao)
        val promise = FakePromise()

        module.getKeepScreenOnDuringReading(promise)
        promise.awaitResolved()

        assertEquals(true, promise.resolvedValue)
    }

    @Test
    fun `saveReadingProgress delega para KavitaChapterFeature reaproveitado`() = runTest {
        val feature: KavitaChapterFeature = mock()
        whenever(feature.saveReadingProgress("c1", "s1", 5)).thenReturn(Result.success(Unit))
        val module = makeModule(feature = feature)
        val promise = FakePromise()

        module.saveReadingProgress("c1", "s1", 5, promise)
        promise.awaitResolved()

        verify(feature).saveReadingProgress("c1", "s1", 5)
        assertNull(promise.rejectedCode)
    }

    @Test
    fun `saveLocalProgress converte scrollFraction Double para Float e delega`() = runTest {
        val feature: KavitaChapterFeature = mock()
        whenever(feature.saveLocalProgress("c1", "s1", 5, 0.25f)).thenReturn(Result.success(Unit))
        val module = makeModule(feature = feature)
        val promise = FakePromise()

        module.saveLocalProgress("c1", "s1", 5, 0.25, promise)
        promise.awaitResolved()

        verify(feature).saveLocalProgress("c1", "s1", 5, 0.25f)
        assertNull(promise.rejectedCode)
    }

    @Test
    fun `getLocalProgress resolve nulo quando nao ha progresso`() = runTest {
        val feature: KavitaChapterFeature = mock()
        whenever(feature.getLocalProgress("c1")).thenReturn(Result.success(null))
        val module = makeModule(feature = feature)
        val promise = FakePromise()

        module.getLocalProgress("c1", promise)
        promise.awaitResolved()

        assertNull(promise.resolvedValue)
        assertNull(promise.rejectedCode)
    }

    @Test
    fun `getServerReadProgress rejeita quando feature falha`() = runTest {
        val feature: KavitaChapterFeature = mock()
        whenever(feature.getServerReadProgress("c1")).thenReturn(Result.failure(IllegalStateException("boom")))
        val module = makeModule(feature = feature)
        val promise = FakePromise()

        module.getServerReadProgress("c1", promise)
        promise.awaitResolved()

        assertEquals("SERVER_PROGRESS_ERROR", promise.rejectedCode)
    }

    // keepScreenOn/allowScreenOff usam UiThreadUtil.runOnUiThread (com.facebook.react.bridge),
    // que por sua vez depende de android.os.Handler real — não executável em teste JVM puro sem
    // Robolectric/instrumentação. Mesma limitação documentada para Arguments.createMap acima;
    // cobertos pelo smoke test manual em dispositivo físico (Task 018).
}
