package com.mymangareader.tools.diagnostics

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class LogcatCaptureTest {
    @Test
    fun `the command reads only this process, warnings and above plus the app's info tags`() {
        val cmd = LogcatCapture.command(1234)

        assertEquals("logcat", cmd.first())
        assertTrue(cmd.contains("--pid=1234"))
        assertTrue(cmd.contains("*:W"))
        assertTrue(cmd.contains("UrlSelector:I"))
        assertTrue(cmd.contains("CacheRetention:I"))
    }

    @Test
    fun `logcat banners are noise, real lines are not`() {
        assertTrue(LogcatCapture.isNoise("--------- beginning of main"))
        assertTrue(LogcatCapture.isNoise("--------- beginning of system"))
        assertEquals(false, LogcatCapture.isNoise("10-13 16:23:32.198  5680  5848 I UrlSelector: probe ..."))
    }
}
