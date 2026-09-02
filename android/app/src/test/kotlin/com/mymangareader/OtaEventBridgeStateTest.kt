package com.mymangareader

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

// The companion-object download-state store that getOtaState() reads back — updated by
// SplashActivity's background download so a splash that mounts mid/post-download isn't left
// without the current phase/progress. These exercise the store directly; emitEvent is a no-op
// with no React instance registered (the guard in ReactBridgeSupport), so no Robolectric needed.
class OtaEventBridgeStateTest {

    @Before
    @After
    fun reset() {
        OtaEventBridge.downloadPhase = "idle"
        OtaEventBridge.downloadProgress = -1f
        OtaEventBridge.pendingPolicy = null
    }

    @Test
    fun `starts idle`() {
        assertEquals("idle", OtaEventBridge.downloadPhase)
        assertEquals(-1f, OtaEventBridge.downloadProgress)
    }

    @Test
    fun `markDownloadStarted moves to downloading indeterminate`() {
        OtaEventBridge.markDownloadStarted()
        assertEquals("downloading", OtaEventBridge.downloadPhase)
        assertEquals(-1f, OtaEventBridge.downloadProgress)
    }

    @Test
    fun `notifyDownloadProgress records the latest phase and progress`() {
        OtaEventBridge.notifyDownloadProgress("downloading", 0.42f)
        assertEquals("downloading", OtaEventBridge.downloadPhase)
        assertEquals(0.42f, OtaEventBridge.downloadProgress)

        OtaEventBridge.notifyDownloadProgress("ready", 1f)
        assertEquals("ready", OtaEventBridge.downloadPhase)
        assertEquals(1f, OtaEventBridge.downloadProgress)
    }

    @Test
    fun `a failed download is recorded as failed indeterminate`() {
        OtaEventBridge.notifyDownloadProgress("failed", -1f)
        assertEquals("failed", OtaEventBridge.downloadPhase)
        assertEquals(-1f, OtaEventBridge.downloadProgress)
    }
}
