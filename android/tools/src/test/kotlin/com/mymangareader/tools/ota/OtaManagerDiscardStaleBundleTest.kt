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

// A non-OTA build/deploy repackages a bundle inside the APK, but the OTA bundle saved in
// app-private storage survives reinstalls untouched. discardStaleBundleIfNeeded() must detect
// when the embedded bundle is newer (by build time, not version string — a version string alone
// can't be trusted: "0.6.0-ota-test-none" and "0.6.0" compare equal by semver) and reset the OTA
// state so the embedded bundle loads again.
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

    private fun manager(embeddedBundleBuildTimeMs: Long) = OtaManager(
        store = store,
        client = OkHttpClient(),
        manifestUrl = "https://example.com/latest.json",
        kotlinVersion = "1.0.0",
        appVersion = "2026.01.01.0000",
        embeddedBundleBuildTimeMs = embeddedBundleBuildTimeMs,
    )

    @Test
    fun `does nothing when no OTA bundle was ever downloaded`() {
        manager(2000L).discardStaleBundleIfNeeded()
        assertEquals("", store.readState().currentBundleVersion)
    }

    @Test
    fun `discards OTA bundle when embedded bundle was built later`() {
        store.bundleFile.writeText("stale ota bundle")
        store.prevBundleFile.writeText("stale prev bundle")
        store.writeState(
            OtaState(currentBundleVersion = "0.5.0", isStable = true, bootCount = 10, bundleBuildTimeMs = 1000L),
        )

        manager(2000L).discardStaleBundleIfNeeded()

        assertFalse(store.bundleFile.exists())
        assertFalse(store.prevBundleFile.exists())
        assertEquals(OtaState(), store.readState())
    }

    @Test
    fun `discards a same-semver test OTA bundle built before a clean rebuild`() {
        // Reproduces the real bug: "0.6.0-ota-test-none" and "0.6.0" compare equal by semver,
        // so a version-string comparison alone would wrongly keep serving the stale test bundle.
        store.bundleFile.writeText("stale ota-test bundle")
        store.writeState(
            OtaState(currentBundleVersion = "0.6.0-ota-test-none", isStable = true, bundleBuildTimeMs = 1000L),
        )

        manager(2000L).discardStaleBundleIfNeeded()

        assertFalse(store.bundleFile.exists())
        assertEquals(OtaState(), store.readState())
    }

    @Test
    fun `keeps OTA bundle when it was built after the embedded bundle`() {
        store.bundleFile.writeText("fresh ota bundle")
        store.writeState(OtaState(currentBundleVersion = "0.7.0", isStable = true, bundleBuildTimeMs = 3000L))

        manager(2000L).discardStaleBundleIfNeeded()

        assertTrue(store.bundleFile.exists())
        assertEquals("0.7.0", store.readState().currentBundleVersion)
    }

    @Test
    fun `keeps OTA bundle when build times are equal`() {
        store.bundleFile.writeText("ota bundle")
        store.writeState(OtaState(currentBundleVersion = "0.6.0", isStable = true, bundleBuildTimeMs = 2000L))

        manager(2000L).discardStaleBundleIfNeeded()

        assertTrue(store.bundleFile.exists())
        assertEquals("0.6.0", store.readState().currentBundleVersion)
    }
}
