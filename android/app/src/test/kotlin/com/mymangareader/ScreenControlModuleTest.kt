package com.mymangareader

import com.facebook.react.bridge.ReactApplicationContext
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mockito.kotlin.mock

class ScreenControlModuleTest {
    @Test
    fun `getName retorna ScreenControlModule`() {
        val module = ScreenControlModule(mock<ReactApplicationContext>())
        assertEquals("ScreenControlModule", module.name)
    }

    // keepScreenOn/allowScreenOff/setImmersiveMode usam UiThreadUtil.runOnUiThread
    // (com.facebook.react.bridge), que depende de android.os.Handler real — não executável neste
    // teste JVM puro. Cobertos por ScreenControlModuleRobolectricTest, que roda sob Robolectric
    // (Handler/Looper simulados). Este módulo não tem mais leitura de DB — a preferência é lida
    // no lado RN (ReaderPrefs → :preferences, Task 039).
}
