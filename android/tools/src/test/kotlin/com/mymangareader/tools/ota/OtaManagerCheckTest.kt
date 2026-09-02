package com.mymangareader.tools.ota

import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.File

// check() is the manifest-fetch + policy + version half of the old checkAndDownload(), split out
// so SplashActivity can act on the decision and launch MainActivity before the bundle download
// runs. These cover the branch table; the download half stays exercised by the existing
// OtaManagerDiscardStaleBundleTest / on-device.
@RunWith(RobolectricTestRunner::class)
class OtaManagerCheckTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    private lateinit var server: MockWebServer
    private lateinit var store: OtaStore

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        store = OtaStore(tempFolder.newFolder("files"))
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    private fun manager(kotlinVersion: String = "1.0.0") = OtaManager(
        store = store,
        client = OkHttpClient(),
        manifestUrl = server.url("/latest.json").toString(),
        kotlinVersion = kotlinVersion,
        appVersion = "2026.01.01.0000",
        embeddedBundleBuildTimeMs = 0L,
    )

    private fun enqueueManifest(json: String) {
        server.enqueue(MockResponse().setResponseCode(200).setBody(json))
    }

    private fun manifestJson(
        rnVersion: String = "1.0.0",
        minKotlin: String = "1.0.0",
        policies: String? = null,
    ): String {
        val policiesField = policies?.let { ""","policies":$it""" } ?: ""
        return """
            {
              "lastRNVersion": "$rnVersion",
              "url": "${server.url("/bundle.js")}",
              "bundleHash": "sha256:00",
              "minKotlinVersion": "$minKotlin",
              "lastAppVersion": "2026.01.01.0000"$policiesField
            }
        """.trimIndent()
    }

    @Test
    fun `manifest fetch failure is Failed, never blocks`() = runTest {
        server.enqueue(MockResponse().setResponseCode(500))
        val decision = manager().check()
        assertTrue(decision is OtaDecision.Failed)
    }

    @Test
    fun `bundle already current is NothingToDo`() = runTest {
        store.writeState(OtaState(currentBundleVersion = "1.0.0"))
        enqueueManifest(manifestJson(rnVersion = "1.0.0"))

        val decision = manager().check()

        assertTrue(decision is OtaDecision.NothingToDo)
        assertEquals(null, (decision as OtaDecision.NothingToDo).advisory)
    }

    @Test
    fun `newer bundle is DownloadPending with the manifest`() = runTest {
        store.writeState(OtaState(currentBundleVersion = "0.9.0"))
        enqueueManifest(manifestJson(rnVersion = "1.0.0"))

        val decision = manager().check()

        assertTrue(decision is OtaDecision.DownloadPending)
        assertEquals("1.0.0", (decision as OtaDecision.DownloadPending).manifest.lastRNVersion)
    }

    @Test
    fun `required policy is Blocked with the release notes url`() = runTest {
        enqueueManifest(
            manifestJson(
                policies = """{"required":[{"type":"app","minVersion":"9999","releaseNotesUrl":"https://notes"}]}""",
            ),
        )

        val decision = manager().check()

        assertTrue(decision is OtaDecision.Blocked)
        assertEquals("https://notes", (decision as OtaDecision.Blocked).releaseNotesUrl)
    }

    @Test
    fun `kotlin below minKotlinVersion is Blocked`() = runTest {
        enqueueManifest(manifestJson(minKotlin = "2.0.0"))

        val decision = manager(kotlinVersion = "1.0.0").check()

        assertTrue(decision is OtaDecision.Blocked)
    }

    @Test
    fun `highly_recommended never downloads — NothingToDo carrying the advisory`() = runTest {
        store.writeState(OtaState(currentBundleVersion = "0.9.0"))
        enqueueManifest(
            manifestJson(
                rnVersion = "1.0.0",
                policies = """{"highly_recommended":[{"type":"app","minVersion":"9999","releaseNotesUrl":"https://hr"}]}""",
            ),
        )

        val decision = manager().check()

        assertTrue(decision is OtaDecision.NothingToDo)
        val advisory = (decision as OtaDecision.NothingToDo).advisory
        assertEquals("highly_recommended", advisory?.mode)
        assertEquals("https://hr", advisory?.releaseNotesUrl)
    }

    @Test
    fun `recommended still downloads — DownloadPending carrying the advisory`() = runTest {
        store.writeState(OtaState(currentBundleVersion = "0.9.0"))
        enqueueManifest(
            manifestJson(
                rnVersion = "1.0.0",
                policies = """{"recommended":[{"type":"app","minVersion":"9999","releaseNotesUrl":"https://rec"}]}""",
            ),
        )

        val decision = manager().check()

        assertTrue(decision is OtaDecision.DownloadPending)
        assertEquals("recommended", (decision as OtaDecision.DownloadPending).advisory?.mode)
    }
}
