package com.mymangareader.tools.ota

import okhttp3.OkHttpClient
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.File

// A non-OTA build/deploy repackages a newer bundle inside the APK, but the OTA bundle saved in
// app-private storage survives reinstalls untouched. discardStaleBundleIfNeeded() must detect
// when the embedded bundle is newer and reset the OTA state so the embedded bundle loads again.
@RunWith(RobolectricTestRunner::class)
class OtaManagerDiscardStaleBundleTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    private lateinit var filesDir: File
    private lateinit var store: OtaStore

    @Before
    fun setUp() {
        filesDir = tempFolder.newFolder("files")
        store = OtaStore(filesDir)
    }

    private fun manager(embeddedRnVersion: String) = OtaManager(
        store = store,
        client = OkHttpClient(),
        manifestUrl = "https://example.com/latest.json",
        kotlinVersion = "1.0.0",
        appVersion = "2026.01.01.0000",
        embeddedRnVersion = embeddedRnVersion,
    )

    @Test
    fun `does nothing when no OTA bundle was ever downloaded`() {
        manager("0.6.0").discardStaleBundleIfNeeded()
        assertEquals("", store.readState().currentBundleVersion)
    }

    @Test
    fun `discards OTA bundle when embedded version is newer`() {
        store.bundleFile.writeText("stale ota bundle")
        store.prevBundleFile.writeText("stale prev bundle")
        store.writeState(OtaState(currentBundleVersion = "0.5.0", isStable = true, bootCount = 10))

        manager("0.6.0").discardStaleBundleIfNeeded()

        assertFalse(store.bundleFile.exists())
        assertFalse(store.prevBundleFile.exists())
        assertEquals(OtaState(), store.readState())
    }

    @Test
    fun `keeps OTA bundle when it is newer than or equal to embedded version`() {
        store.bundleFile.writeText("fresh ota bundle")
        store.writeState(OtaState(currentBundleVersion = "0.7.0", isStable = true))

        manager("0.6.0").discardStaleBundleIfNeeded()

        assertTrue(store.bundleFile.exists())
        assertEquals("0.7.0", store.readState().currentBundleVersion)
    }

    @Test
    fun `keeps OTA bundle when versions are equal`() {
        store.bundleFile.writeText("ota bundle")
        store.writeState(OtaState(currentBundleVersion = "0.6.0", isStable = true))

        manager("0.6.0").discardStaleBundleIfNeeded()

        assertTrue(store.bundleFile.exists())
        assertEquals("0.6.0", store.readState().currentBundleVersion)
    }
}
