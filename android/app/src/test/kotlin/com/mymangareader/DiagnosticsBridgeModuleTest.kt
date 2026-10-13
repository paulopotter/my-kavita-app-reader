package com.mymangareader

import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File

class DiagnosticsBridgeModuleTest {
    @Test
    fun `an external directory is read with a plain adb pull on any build`() {
        val dir = File("/storage/emulated/0/Android/data/com.mymangareader/files/diagnostics")

        assertEquals(
            "adb pull /sdcard/Android/data/com.mymangareader/files/diagnostics/app-diagnostics.log",
            DiagnosticsBridgeModule.adbCommand("com.mymangareader", dir, internal = false),
        )
    }

    @Test
    fun `the private directory falls back to run-as, which needs a debuggable build`() {
        assertEquals(
            "adb exec-out run-as com.mymangareader cat files/diagnostics/app-diagnostics.log",
            DiagnosticsBridgeModule.adbCommand("com.mymangareader", File("/data/user/0/com.mymangareader/files/diagnostics"), internal = true),
        )
    }
}
