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

    private fun manager(
        kotlinVersion: String = "1.0.0",
        appVersion: String = "2026.01.01.0000",
        fallback: OtaFallbackConfig = noFallback(),
    ) = OtaManager(
        store = store,
        client = OkHttpClient(),
        manifestUrl = server.url("/latest.json").toString(),
        fallback = fallback,
        kotlinVersion = kotlinVersion,
        appVersion = appVersion,
        embeddedBundleBuildTimeMs = 0L,
    )

    // Aponta o "oficial" para a MESMA url configurada — OtaManager pula o fallback nesse caso,
    // então os testes que não são sobre fallback se comportam como antes.
    private fun noFallback() =
        OtaFallbackConfig(
            officialManifestUrl = server.url("/latest.json").toString(),
            onError = false,
            onNoUpdate = false,
        )

    private fun enqueueManifest(json: String) {
        server.enqueue(MockResponse().setResponseCode(200).setBody(json))
    }

    private fun manifestJson(
        rnVersion: String = "1.0.0",
        minKotlin: String = "1.0.0",
        policies: String? = null,
        lastAppVersion: String = "2026.01.01.0000",
    ): String {
        val policiesField = policies?.let { ""","policies":$it""" } ?: ""
        return """
            {
              "lastRNVersion": "$rnVersion",
              "url": "${server.url("/bundle.js")}",
              "bundleHash": "sha256:00",
              "minKotlinVersion": "$minKotlin",
              "lastAppVersion": "$lastAppVersion"$policiesField
            }
            """.trimIndent()
    }

    @Test
    fun `manifest fetch failure is Failed, never blocks`() =
        runTest {
            server.enqueue(MockResponse().setResponseCode(500))
            val decision = manager().check()
            assertTrue(decision is OtaDecision.Failed)
        }

    @Test
    fun `bundle already current is NothingToDo`() =
        runTest {
            store.writeState(OtaState(currentBundleVersion = "1.0.0"))
            enqueueManifest(manifestJson(rnVersion = "1.0.0"))

            val decision = manager().check()

            assertTrue(decision is OtaDecision.NothingToDo)
            assertEquals(null, (decision as OtaDecision.NothingToDo).advisory)
        }

    @Test
    fun `newer bundle is DownloadPending with the manifest`() =
        runTest {
            store.writeState(OtaState(currentBundleVersion = "0.9.0"))
            enqueueManifest(manifestJson(rnVersion = "1.0.0"))

            val decision = manager().check()

            assertTrue(decision is OtaDecision.DownloadPending)
            assertEquals("1.0.0", (decision as OtaDecision.DownloadPending).manifest.lastRNVersion)
        }

    @Test
    fun `required policy is Blocked with the release notes url`() =
        runTest {
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
    fun `kotlin below minKotlinVersion is Blocked`() =
        runTest {
            enqueueManifest(manifestJson(minKotlin = "2.0.0"))

            val decision = manager(kotlinVersion = "1.0.0").check()

            assertTrue(decision is OtaDecision.Blocked)
        }

    @Test
    fun `highly_recommended never downloads — NothingToDo carrying the advisory`() =
        runTest {
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
    fun `recommended still downloads — DownloadPending carrying the advisory`() =
        runTest {
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

    // ── Fallback para o manifesto oficial ─────────────────────────────────────
    //
    // O cenário real: OTA_MANIFEST_URL aponta pro servidor de dev (scripts/ota-serve.sh), que só
    // está no ar enquanto o script roda. Sem fallback, um device em build de dev nunca enxerga uma
    // release de verdade. Em nenhum caso o fallback pode regredir o que está instalado.

    private lateinit var official: MockWebServer

    private fun startOfficial(): MockWebServer =
        MockWebServer().also {
            it.start()
            official = it
        }

    private fun fallbackConfig(
        onError: Boolean = false,
        onNoUpdate: Boolean = false,
    ) = OtaFallbackConfig(
        officialManifestUrl = official.url("/latest.json").toString(),
        onError = onError,
        onNoUpdate = onNoUpdate,
    )

    private fun officialManifestJson(
        rnVersion: String = "2.0.0",
        lastAppVersion: String = "2026.06.01.0000",
    ): String =
        """
        {
          "lastRNVersion": "$rnVersion",
          "url": "${official.url("/bundle.js")}",
          "bundleHash": "sha256:00",
          "minKotlinVersion": "1.0.0",
          "lastAppVersion": "$lastAppVersion"
        }
        """.trimIndent()

    @Test
    fun `com onError, um manifesto inalcancavel cai pro oficial e baixa a release mais nova`() =
        runTest {
            startOfficial().enqueue(MockResponse().setResponseCode(200).setBody(officialManifestJson()))
            server.enqueue(MockResponse().setResponseCode(500)) // servidor de dev fora do ar

            val decision = manager(fallback = fallbackConfig(onError = true)).check()

            assertTrue(decision is OtaDecision.DownloadPending)
            assertEquals("2.0.0", (decision as OtaDecision.DownloadPending).manifest.lastRNVersion)
            official.shutdown()
        }

    @Test
    fun `sem onError, um manifesto inalcancavel falha sem consultar o oficial`() =
        runTest {
            startOfficial()
            server.enqueue(MockResponse().setResponseCode(500))

            val decision = manager(fallback = fallbackConfig(onError = false)).check()

            assertTrue(decision is OtaDecision.Failed)
            assertEquals(0, official.requestCount)
            official.shutdown()
        }

    @Test
    fun `com onNoUpdate, um dev sem novidade cai pro oficial quando ele e mais novo`() =
        runTest {
            startOfficial().enqueue(MockResponse().setResponseCode(200).setBody(officialManifestJson()))
            store.writeState(OtaState(currentBundleVersion = "1.0.0"))
            enqueueManifest(manifestJson(rnVersion = "1.0.0")) // mesma versão: nada novo

            val decision = manager(fallback = fallbackConfig(onNoUpdate = true)).check()

            assertTrue(decision is OtaDecision.DownloadPending)
            official.shutdown()
        }

    @Test
    fun `o oficial mais antigo que o instalado e ignorado, mantendo o bundle local`() =
        runTest {
            // O caso do `make redeploy`: acabei de instalar um build de hoje; a release é de meses
            // atrás e não pode passar por cima dele.
            startOfficial().enqueue(
                MockResponse().setResponseCode(200).setBody(officialManifestJson(lastAppVersion = "2026.01.01.0000")),
            )
            store.writeState(OtaState(currentBundleVersion = "1.0.0"))
            enqueueManifest(manifestJson(rnVersion = "1.0.0"))

            val decision =
                manager(
                    appVersion = "2026.09.14.1200",
                    fallback = fallbackConfig(onNoUpdate = true),
                ).check()

            assertTrue(decision is OtaDecision.NothingToDo)
            official.shutdown()
        }

    @Test
    fun `o oficial na mesma versao do instalado nao e novidade`() =
        runTest {
            startOfficial().enqueue(
                MockResponse().setResponseCode(200).setBody(officialManifestJson(lastAppVersion = "2026.09.14.1200")),
            )
            store.writeState(OtaState(currentBundleVersion = "1.0.0"))
            enqueueManifest(manifestJson(rnVersion = "1.0.0"))

            val decision =
                manager(
                    appVersion = "2026.09.14.1200",
                    fallback = fallbackConfig(onNoUpdate = true),
                ).check()

            assertTrue(decision is OtaDecision.NothingToDo)
            official.shutdown()
        }

    @Test
    fun `um oficial tambem fora do ar deixa a decisao original de pe`() =
        runTest {
            startOfficial().enqueue(MockResponse().setResponseCode(500))
            store.writeState(OtaState(currentBundleVersion = "1.0.0"))
            enqueueManifest(manifestJson(rnVersion = "1.0.0"))

            val decision = manager(fallback = fallbackConfig(onNoUpdate = true)).check()

            // Nada quebrou e nada mudou — o que estava rodando continua rodando.
            assertTrue(decision is OtaDecision.NothingToDo)
            official.shutdown()
        }

    @Test
    fun `uma atualizacao real do manifesto configurado nunca consulta o oficial`() =
        runTest {
            startOfficial()
            store.writeState(OtaState(currentBundleVersion = "0.9.0"))
            enqueueManifest(manifestJson(rnVersion = "1.0.0"))

            val decision = manager(fallback = fallbackConfig(onError = true, onNoUpdate = true)).check()

            assertTrue(decision is OtaDecision.DownloadPending)
            assertEquals(0, official.requestCount)
            official.shutdown()
        }
}
