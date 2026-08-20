package com.mymangareader

import com.facebook.react.bridge.ReactApplicationContext
import com.mymangareader.core.database.UiPreferencesDao
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever

class ScreenControlModuleTest {

    private fun makeModule(uiPreferencesDao: UiPreferencesDao = mock()): ScreenControlModule {
        val context = mock<ReactApplicationContext>()
        return ScreenControlModule(uiPreferencesDao, context)
    }

    @Test
    fun `getName retorna ScreenControlModule`() {
        assertEquals("ScreenControlModule", makeModule().name)
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
    fun `getImmersiveModeDuringReading delega para UiPreferencesDao`() = runTest {
        val dao: UiPreferencesDao = mock()
        whenever(dao.getImmersiveModeDuringReading()).thenReturn(true)
        val module = makeModule(uiPreferencesDao = dao)
        val promise = FakePromise()

        module.getImmersiveModeDuringReading(promise)
        promise.awaitResolved()

        assertEquals(true, promise.resolvedValue)
    }

    @Test
    fun `getImmersiveModeDuringReading usa false como padrao quando preferencia ausente`() = runTest {
        val dao: UiPreferencesDao = mock()
        whenever(dao.getImmersiveModeDuringReading()).thenReturn(null)
        val module = makeModule(uiPreferencesDao = dao)
        val promise = FakePromise()

        module.getImmersiveModeDuringReading(promise)
        promise.awaitResolved()

        assertEquals(false, promise.resolvedValue)
    }

    // keepScreenOn/allowScreenOff/setImmersiveMode usam UiThreadUtil.runOnUiThread
    // (com.facebook.react.bridge), que depende de android.os.Handler real — não executável neste
    // teste JVM puro. Cobertos por ScreenControlModuleRobolectricTest, que roda sob Robolectric
    // (Handler/Looper simulados).
}
