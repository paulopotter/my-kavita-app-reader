package com.mymangareader.externalmetadataserver

import com.mymangareader.cache.Cache
import com.mymangareader.core.database.CacheDao
import com.mymangareader.core.database.CacheEntity
import com.mymangareader.core.database.ExternalMetadataGroupDao
import com.mymangareader.core.database.ExternalMetadataGroupEntity
import com.mymangareader.core.database.ExternalMetadataUrlDao
import com.mymangareader.core.database.ExternalMetadataUrlEntity
import com.mymangareader.core.database.ServerGroupDao
import com.mymangareader.core.database.ServerGroupEntity
import com.mymangareader.core.database.ServerUrlDao
import com.mymangareader.core.database.ServerUrlEntity
import com.mymangareader.externalmetadataserver.plugins.CredentialField
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataMatch
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataPlugin
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataPluginRegistration
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataSeriesRef
import com.mymangareader.server.NewServerGroup
import com.mymangareader.server.NewServerUrl
import com.mymangareader.server.Server
import com.mymangareader.server.plugins.CredentialField as ServerCredentialField
import com.mymangareader.server.plugins.PluginSerial
import com.mymangareader.server.plugins.ServerPlugin
import com.mymangareader.server.plugins.ServerPluginRegistration
import com.mymangareader.tools.network.ActiveUrlSelector
import com.mymangareader.tools.network.RequestTool
import com.mymangareader.tools.network.UrlCandidate
import com.mymangareader.tools.network.UrlProbeResult
import com.mymangareader.tools.network.UrlSelector
import java.io.IOException
import kotlin.test.assertFailsWith
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

// ── Fakes ──────────────────────────────────────────────────────────────────

private class FakeExternalMetadataGroupDao : ExternalMetadataGroupDao {
    private val rows = mutableMapOf<String, ExternalMetadataGroupEntity>()
    override suspend fun upsert(entity: ExternalMetadataGroupEntity) { rows[entity.id] = entity }
    override suspend fun delete(entity: ExternalMetadataGroupEntity) { rows.remove(entity.id) }
    override fun observeAll(): Flow<List<ExternalMetadataGroupEntity>> = MutableStateFlow(rows.values.toList())
    override suspend fun getAll(): List<ExternalMetadataGroupEntity> = rows.values.toList()
    override suspend fun getById(id: String): ExternalMetadataGroupEntity? = rows[id]
    override suspend fun deleteById(id: String) { rows.remove(id) }
}

private class FakeExternalMetadataUrlDao : ExternalMetadataUrlDao {
    private val rows = mutableMapOf<String, ExternalMetadataUrlEntity>()
    override suspend fun upsert(entity: ExternalMetadataUrlEntity) { rows[entity.id] = entity }
    override suspend fun delete(entity: ExternalMetadataUrlEntity) { rows.remove(entity.id) }
    override fun observeByGroupId(groupId: String): Flow<List<ExternalMetadataUrlEntity>> =
        MutableStateFlow(rows.values.filter { it.groupId == groupId }.sortedBy { it.priority })
    override suspend fun getByGroupId(groupId: String): List<ExternalMetadataUrlEntity> =
        rows.values.filter { it.groupId == groupId }.sortedBy { it.priority }
    override suspend fun getAll(): List<ExternalMetadataUrlEntity> = rows.values.toList()
    override suspend fun getById(id: String): ExternalMetadataUrlEntity? = rows[id]
    override suspend fun deleteById(id: String) { rows.remove(id) }
    override suspend fun deleteByGroupId(groupId: String) { rows.values.filter { it.groupId == groupId }.forEach { rows.remove(it.id) } }
}

// ── Server fakes (for syncByServerId/ByServerUrl and the no-hint resolver, same-layer
// composition — Server is always passed by parameter, never a constructor dependency) ───────

private class FakeServerGroupDao : ServerGroupDao {
    private val rows = mutableMapOf<String, ServerGroupEntity>()
    override suspend fun upsert(entity: ServerGroupEntity) { rows[entity.id] = entity }
    override suspend fun delete(entity: ServerGroupEntity) { rows.remove(entity.id) }
    override fun observeAll(): Flow<List<ServerGroupEntity>> = MutableStateFlow(rows.values.toList())
    override suspend fun getAll(): List<ServerGroupEntity> = rows.values.toList()
    override suspend fun getById(id: String): ServerGroupEntity? = rows[id]
    override suspend fun deleteById(id: String) { rows.remove(id) }
}

private class FakeServerUrlDao : ServerUrlDao {
    private val rows = mutableMapOf<String, ServerUrlEntity>()
    override suspend fun upsert(entity: ServerUrlEntity) { rows[entity.id] = entity }
    override suspend fun delete(entity: ServerUrlEntity) { rows.remove(entity.id) }
    override fun observeByGroupId(groupId: String): Flow<List<ServerUrlEntity>> =
        MutableStateFlow(rows.values.filter { it.groupId == groupId }.sortedBy { it.priority })
    override suspend fun getByGroupId(groupId: String): List<ServerUrlEntity> =
        rows.values.filter { it.groupId == groupId }.sortedBy { it.priority }
    override suspend fun getById(id: String): ServerUrlEntity? = rows[id]
    override suspend fun deleteById(id: String) { rows.remove(id) }
    override suspend fun deleteByGroupId(groupId: String) { rows.values.filter { it.groupId == groupId }.forEach { rows.remove(it.id) } }
}

// Minimal ServerPlugin double, only enough for a Server instance to resolve/authenticate — no
// test in this file exercises Server's own content methods, only groups/group(id).getUrls()/
// getActiveGroupId().
private fun fakeServerRegistration(): ServerPluginRegistration = object : ServerPluginRegistration {
    override val id = "fake-server"
    override val displayName = "Fake Server"
    override val version = "0.0.0"
    override val credentialFields: List<ServerCredentialField> = emptyList()
    override val factory = { _: RequestTool, _: String, _: String ->
        object : ServerPlugin {
            override val id = "fake-server"
            override val displayName = "Fake Server"
            override val version = "0.0.0"
            override val auth = object : ServerPlugin.Auth {
                override suspend fun authenticate() = Unit
                override suspend fun checkToken(): String? = null
                override suspend fun reauthenticate() = Unit
                override suspend fun logout() = Unit
                override fun getSession(): String? = null
            }
            override val serials = object : ServerPlugin.Serials {
                override suspend fun list(): List<PluginSerial> = emptyList()
            }
            override fun serial(serialId: String): ServerPlugin.Serial = throw NotImplementedError()
        } as ServerPlugin
    }
}

// A controllable UrlSelector double — lets network-retry tests assert exactly how many times
// each method was called, without depending on ActiveUrlSelector's real 15-minute cache or
// MockWebServer's timing for the retry scenarios specifically.
private class FakeUrlSelector(private val url: String) : UrlSelector {
    var getActiveUrlCalls = 0
    var invalidateAndReselectCalls = 0
    override suspend fun getActiveUrl(candidates: List<UrlCandidate>): Result<String> {
        getActiveUrlCalls++
        return Result.success(url)
    }
    override suspend fun invalidateAndReselect(candidates: List<UrlCandidate>): Result<String> {
        invalidateAndReselectCalls++
        return Result.success(url)
    }
    override fun getLastKnownUrl(): String? = url
    override suspend fun probe(candidate: UrlCandidate) =
        UrlProbeResult(candidate.url.trimEnd('/'), ok = true, status = 200, elapsedMs = 1)
}

// A minimal ExternalMetadataPlugin double — records what ExternalMetadataServer called it with.
// failFetchMatchesWith/failFetchMatchWith, when set, make exactly the next call throw that error
// instead of returning — used to simulate a dead URL for the network-retry tests.
private class FakePlugin(
    val authJson: String,
    var failFetchMatchesWith: Throwable? = null,
    var failFetchMatchWith: Throwable? = null,
) : ExternalMetadataPlugin {
    override val id = "fake"
    override val displayName = "Fake"
    override val version = "0.0.0"

    override val auth = object : ExternalMetadataPlugin.Auth {
        override suspend fun authenticate() = Unit
        override suspend fun checkToken(): String? = null
        override suspend fun reauthenticate() = Unit
        override suspend fun logout() = Unit
        override fun getSession(): String? = null
    }

    var lastFetchMatchesSeries: List<ExternalMetadataSeriesRef>? = null
    var lastFetchMatchSeries: ExternalMetadataSeriesRef? = null

    override suspend fun fetchMatches(series: List<ExternalMetadataSeriesRef>): List<ExternalMetadataMatch?> {
        failFetchMatchesWith?.let { failFetchMatchesWith = null; throw it }
        lastFetchMatchesSeries = series
        return series.map { fakeMatch(it.id) }
    }

    override suspend fun fetchMatch(series: ExternalMetadataSeriesRef): ExternalMetadataMatch? {
        failFetchMatchWith?.let { failFetchMatchWith = null; throw it }
        lastFetchMatchSeries = series
        return fakeMatch(series.id)
    }

    private fun fakeMatch(seriesId: String) = ExternalMetadataMatch(
        seriesId = seriesId, slug = "slug-$seriesId", status = "ongoing",
        downloadedChapters = 3, totalChapters = 10, latestChapterLabel = "10", hasErrors = false,
    )
}

// In-memory CacheDao — just enough for a real Cache() to construct against in these tests, none
// of which exercise Cache.network/M3Plugin's own cache behavior directly.
private class FakeCacheDao : CacheDao {
    private data class MapKey(val key: String, val variant: String)

    private val entities = mutableMapOf<MapKey, CacheEntity>()

    override suspend fun getByKey(key: String, variant: String): CacheEntity? = entities[MapKey(key, variant)]
    override suspend fun upsert(entity: CacheEntity) { entities[MapKey(entity.key, entity.variant)] = entity }
    override suspend fun touchLastAccessed(key: String, variant: String, lastAccessedAtEpochMs: Long) = Unit
    override suspend fun deleteByKey(key: String, variant: String) { entities.remove(MapKey(key, variant)) }
    override suspend fun deleteByDomain(domain: String) {
        entities.values.filter { it.domain == domain }.forEach { entities.remove(MapKey(it.key, it.variant)) }
    }
    override suspend fun deleteByVariant(domain: String, variant: String) {
        entities.values.filter { it.domain == domain && it.variant == variant }.forEach { entities.remove(MapKey(it.key, it.variant)) }
    }
    override suspend fun getAllExpired(nowEpochMs: Long): List<CacheEntity> = entities.values.filter { it.expiresAtEpochMs <= nowEpochMs }
    override suspend fun getOlderThan(cutoffEpochMs: Long): List<CacheEntity> =
        entities.values.filter { it.cachedAtEpochMs < cutoffEpochMs && it.lastAccessedAtEpochMs < cutoffEpochMs }
    override suspend fun queryFiltered(keys: List<String>, hasKeys: Int, domain: String?, variant: String?): List<CacheEntity> =
        entities.values.filter { e -> (hasKeys == 0 || e.key in keys) && (domain == null || e.domain == domain) && (variant == null || e.variant == variant) }

    override suspend fun deleteExpired(entries: List<CacheEntity>) {
        entries.forEach { entities.remove(MapKey(it.key, it.variant)) }
    }
}

private fun fakeRegistration(
    id: String = "fake",
    credentialFields: List<CredentialField> = emptyList(),
    // Called with the exact FakePlugin instance factory is about to hand back to
    // ExternalMetadataServer — not a separate one — so tests can track/assert on the same
    // instance the server actually calls.
    onFactory: (RequestTool, String, String, FakePlugin) -> Unit = { _, _, _, _ -> },
): ExternalMetadataPluginRegistration = object : ExternalMetadataPluginRegistration {
    override val id = id
    override val displayName = "Fake $id"
    override val version = "0.0.0"
    override val credentialFields = credentialFields
    override val factory = { requestTool: RequestTool, _: Cache, baseUrl: String, authJson: String ->
        val plugin = FakePlugin(authJson)
        onFactory(requestTool, baseUrl, authJson, plugin)
        plugin as ExternalMetadataPlugin
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────

class ExternalMetadataServerTest {

    private lateinit var mockServer: MockWebServer
    private lateinit var baseUrl: String
    private lateinit var groupDao: FakeExternalMetadataGroupDao
    private lateinit var urlDao: FakeExternalMetadataUrlDao
    private lateinit var kavitaServer: Server
    private lateinit var server: ExternalMetadataServer

    @Before
    fun setUp() {
        mockServer = MockWebServer()
        mockServer.start()
        baseUrl = mockServer.url("/").toString().trimEnd('/')
        groupDao = FakeExternalMetadataGroupDao()
        urlDao = FakeExternalMetadataUrlDao()
        kavitaServer = buildTestKavitaServer()
        server = ExternalMetadataServer(
            groupDao,
            urlDao,
            mapOf("fake" to fakeRegistration()),
            ActiveUrlSelector(OkHttpClient(), Cache(FakeCacheDao())),
            RequestTool(OkHttpClient()),
            Cache(FakeCacheDao()),
        )
    }

    private fun buildTestKavitaServer(): Server = Server(
        FakeServerGroupDao(),
        FakeServerUrlDao(),
        mapOf("fake-server" to fakeServerRegistration()),
        ActiveUrlSelector(OkHttpClient(), Cache(FakeCacheDao())),
        RequestTool(OkHttpClient()),
    )

    @After
    fun tearDown() {
        mockServer.shutdown()
    }

    private suspend fun addHealthyGroup(linkedServerGroupId: String? = null): String {
        val group = server.groups.add(NewExternalMetadataGroup("My M3", "fake", "{}", "/health", linkedServerGroupId))
        mockServer.enqueue(MockResponse().setResponseCode(200)) // health check
        server.group(group.id).addUrl(NewExternalMetadataUrl(baseUrl, 5000, 0))
        return group.id
    }

    // ── providers ────────────────────────────────────────────────────────

    @Test
    fun `providers list exposes every registered plugin's identity`() {
        val providers = server.providers.list()

        assertEquals(1, providers.size)
        assertEquals("fake", providers.single().id)
        assertEquals("Fake fake", providers.single().displayName)
    }

    // ── groups CRUD ──────────────────────────────────────────────────────

    @Test
    fun `groups add rejects an unknown providerId`() = runTest {
        assertFailsWith<ExternalMetadataServerException> {
            server.groups.add(NewExternalMetadataGroup("X", "unknown-provider", "{}", "/health"))
        }
    }

    @Test
    fun `groups add rejects a blank name`() = runTest {
        assertFailsWith<ExternalMetadataServerException> {
            server.groups.add(NewExternalMetadataGroup("", "fake", "{}", "/health"))
        }
    }

    @Test
    fun `groups add succeeds with no linked server group`() = runTest {
        val group = server.groups.add(NewExternalMetadataGroup("My M3", "fake", "{}", "/health"))

        assertEquals("My M3", group.name)
        assertEquals("fake", group.providerId)
        assertNull(group.linkedServerGroupId)
    }

    @Test
    fun `groups add succeeds with a linked server group`() = runTest {
        val group = server.groups.add(NewExternalMetadataGroup("My M3", "fake", "{}", "/health", "server-group-1"))

        assertEquals("server-group-1", group.linkedServerGroupId)
    }

    @Test
    fun `groups list and get reflect what was added`() = runTest {
        val created = server.groups.add(NewExternalMetadataGroup("My M3", "fake", "{}", "/health"))

        assertEquals(listOf(created), server.groups.list())
        assertEquals(created, server.groups.get(created.id))
        assertNull(server.groups.get("missing"))
    }

    @Test
    fun `groups update changes only the fields passed`() = runTest {
        val group = server.groups.add(NewExternalMetadataGroup("My M3", "fake", "{}", "/health"))

        val updated = server.groups.update(group.id, name = "Renamed")

        assertEquals("Renamed", updated.name)
        assertNull(updated.linkedServerGroupId)
    }

    @Test
    fun `groups update can set linkedServerGroupId`() = runTest {
        val group = server.groups.add(NewExternalMetadataGroup("My M3", "fake", "{}", "/health"))

        val updated = server.groups.update(group.id, linkedServerGroupId = "server-group-1")

        assertEquals("server-group-1", updated.linkedServerGroupId)
    }

    @Test
    fun `groups remove also deletes its urls`() = runTest {
        val groupId = addHealthyGroup()

        server.groups.remove(groupId)

        assertNull(server.groups.get(groupId))
        assertTrue(server.group(groupId).getUrls().isEmpty())
    }

    // ── group(id) urls CRUD ──────────────────────────────────────────────

    @Test
    fun `group addUrl rejects when the group doesn't exist`() = runTest {
        assertFailsWith<ExternalMetadataServerException> {
            server.group("missing").addUrl(NewExternalMetadataUrl("http://x", 5000, 0))
        }
    }

    @Test
    fun `group addUrl rejects a blank url`() = runTest {
        val group = server.groups.add(NewExternalMetadataGroup("My M3", "fake", "{}", "/health"))

        assertFailsWith<ExternalMetadataServerException> {
            server.group(group.id).addUrl(NewExternalMetadataUrl("", 5000, 0))
        }
    }

    @Test
    fun `group addUrl rejects a non-positive timeout`() = runTest {
        val group = server.groups.add(NewExternalMetadataGroup("My M3", "fake", "{}", "/health"))

        assertFailsWith<ExternalMetadataServerException> {
            server.group(group.id).addUrl(NewExternalMetadataUrl("http://x", 0, 0))
        }
    }

    @Test
    fun `group addUrl succeeds with a linked server url`() = runTest {
        val group = server.groups.add(NewExternalMetadataGroup("My M3", "fake", "{}", "/health"))

        val url = server.group(group.id).addUrl(NewExternalMetadataUrl("http://x", 5000, 0, "server-url-1"))

        assertEquals("server-url-1", url.linkedServerUrlId)
    }

    @Test
    fun `group updateUrl fails for a url belonging to a different group`() = runTest {
        val groupA = server.groups.add(NewExternalMetadataGroup("A", "fake", "{}", "/health"))
        val groupB = server.groups.add(NewExternalMetadataGroup("B", "fake", "{}", "/health"))
        val urlInA = server.group(groupA.id).addUrl(NewExternalMetadataUrl("http://a", 5000, 0))

        assertFailsWith<ExternalMetadataServerException> {
            server.group(groupB.id).updateUrl(urlInA.id, priority = 9)
        }
    }

    @Test
    fun `group removeUrl fails for a url belonging to a different group`() = runTest {
        val groupA = server.groups.add(NewExternalMetadataGroup("A", "fake", "{}", "/health"))
        val groupB = server.groups.add(NewExternalMetadataGroup("B", "fake", "{}", "/health"))
        val urlInA = server.group(groupA.id).addUrl(NewExternalMetadataUrl("http://a", 5000, 0))

        assertFailsWith<ExternalMetadataServerException> {
            server.group(groupB.id).removeUrl(urlInA.id)
        }
    }

    @Test
    fun `group getUrls returns urls sorted by priority`() = runTest {
        val group = server.groups.add(NewExternalMetadataGroup("A", "fake", "{}", "/health"))
        server.group(group.id).addUrl(NewExternalMetadataUrl("http://b", 5000, 1))
        server.group(group.id).addUrl(NewExternalMetadataUrl("http://a", 5000, 0))

        val urls = server.group(group.id).getUrls()

        assertEquals(listOf("http://a", "http://b"), urls.map { it.url })
    }

    // ── group.getInfo / ExternalMetadataServer.getActiveGroupInfo ────────

    @Test
    fun `group getInfo throws when the group doesn't exist`() = runTest {
        assertFailsWith<ExternalMetadataServerException> { server.group("missing").getInfo() }
    }

    @Test
    fun `group getInfo returns the group's identity with its urls embedded, without credentialsJson or healthCheckPath`() = runTest {
        val group = server.groups.add(NewExternalMetadataGroup("My M3", "fake", "{}", "/health"))
        server.group(group.id).addUrl(NewExternalMetadataUrl("http://b", 5000, 1))
        server.group(group.id).addUrl(NewExternalMetadataUrl("http://a", 5000, 0))

        val info = server.group(group.id).getInfo()

        assertEquals(group.id, info.id)
        assertEquals("My M3", info.name)
        assertEquals("fake", info.providerId)
        assertEquals(listOf("http://a", "http://b"), info.urls.map { it.url })
    }

    @Test
    fun `getActiveGroupInfo returns null when no group is active`() = runTest {
        assertNull(server.getActiveGroupInfo())
    }

    @Test
    fun `getActiveGroupInfo delegates to the active group's getInfo`() = runTest {
        val groupId = addHealthyGroup()
        server.setActiveGroup(groupId)

        val info = server.getActiveGroupInfo()

        assertEquals(groupId, info?.id)
        assertEquals(listOf(baseUrl), info?.urls?.map { it.url })
    }

    // ── setActiveGroup / getActive / getActiveInfo ───────────────────────

    @Test
    fun `getActiveGroupId is null before any setActiveGroup call`() {
        assertNull(server.getActiveGroupId())
    }

    @Test
    fun `setActiveGroup sets getActiveGroupId`() = runTest {
        val groupId = addHealthyGroup()

        server.setActiveGroup(groupId)

        assertEquals(groupId, server.getActiveGroupId())
    }

    @Test
    fun `getActive already reflects the url setActiveGroup itself resolved`() = runTest {
        val groupId = addHealthyGroup()

        // setActiveGroup always resolves the group's healthy URL (needed to build the plugin
        // that authenticate() runs against, even for a no-op auth like M3's) — so getActive()
        // already has a real entry right after, same as Server.setActiveGroup's own contract.
        server.setActiveGroup(groupId)

        assertEquals(baseUrl, server.getActive()?.url)
    }

    @Test
    fun `getActive returns null before this group has ever been resolved at all`() = runTest {
        val groupId = addHealthyGroup()

        // addHealthyGroup only adds the group+url rows — it never calls setActiveGroup or any
        // content method, so resolvePlugin has never run for this group yet.
        assertNull(server.group(groupId).getActive())
    }

    @Test
    fun `getActive and getActiveInfo reflect the url a match call resolved`() = runTest {
        val groupId = addHealthyGroup()
        server.setActiveGroup(groupId)
        mockServer.enqueue(MockResponse().setResponseCode(200))

        server.match.syncByGroup(groupId, ExternalMetadataSeriesRef("1", "Series 1"))

        assertEquals(baseUrl, server.getActive()?.url)
        assertEquals(groupId, server.getActiveInfo()?.groupId)
        assertEquals(baseUrl, server.getActiveInfo()?.url)
    }

    @Test
    fun `reauthenticateActiveGroup succeeds as a real no-op for a provider with no auth`() = runTest {
        val groupId = addHealthyGroup()
        server.setActiveGroup(groupId)

        server.reauthenticateActiveGroup(groupId)

        assertEquals(groupId, server.getActiveGroupId())
    }

    // ── match.syncByGroup (explicit group) ───────────────────────────────

    @Test
    fun `match syncByGroup throws when the group doesn't exist`() = runTest {
        assertFailsWith<ExternalMetadataServerException> {
            server.match.syncByGroup("missing", ExternalMetadataSeriesRef("1", "Series 1"))
        }
    }

    @Test
    fun `match syncByGroup delegates to the plugin's own fetchMatch, not fetchMatches`() = runTest {
        val groupId = addHealthyGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200)) // resolvePlugin's health check

        val response = server.match.syncByGroup(groupId, ExternalMetadataSeriesRef("1", "Series 1"))

        assertEquals("1", response.data?.seriesId)
    }

    @Test
    fun `match syncByGroup envelope carries the group and url that answered it`() = runTest {
        val groupId = addHealthyGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val response = server.match.syncByGroup(groupId, ExternalMetadataSeriesRef("1", "Series 1"))

        assertEquals(groupId, response.serverInfo.groupId)
        assertEquals(baseUrl, response.serverInfo.url)
    }

    // ── matches.syncByGroup (batch, explicit group) ──────────────────────

    @Test
    fun `matches syncByGroup throws when the group doesn't exist`() = runTest {
        assertFailsWith<ExternalMetadataServerException> {
            server.matches.syncByGroup("missing", listOf(ExternalMetadataSeriesRef("1", "Series 1")))
        }
    }

    @Test
    fun `matches syncByGroup delegates the series list to the active plugin and returns positional matches`() = runTest {
        val groupId = addHealthyGroup()
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val response = server.matches.syncByGroup(groupId, listOf(ExternalMetadataSeriesRef("1", "Series 1")))

        assertEquals(listOf("1"), response.data.map { it?.seriesId })
    }

    // ── match.syncByServerId / matches.syncByServerId ────────────────────

    @Test
    fun `match syncByServerId resolves the group linked to the given kavita server group`() = runTest {
        val linkedGroupId = addHealthyGroup(linkedServerGroupId = "kavita-group-1")
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val response = server.match.syncByServerId("kavita-group-1", ExternalMetadataSeriesRef("1", "Series 1"))

        assertEquals(linkedGroupId, response.serverInfo.groupId)
    }

    @Test
    fun `match syncByServerId falls back to the unlinked group when no link matches`() = runTest {
        addHealthyGroup() // unlinked
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val response = server.match.syncByServerId("unknown-kavita-group", ExternalMetadataSeriesRef("1", "Series 1"))

        assertEquals("1", response.data?.seriesId)
    }

    @Test
    fun `match syncByServerId throws when nothing matches and no unlinked fallback exists`() = runTest {
        addHealthyGroup(linkedServerGroupId = "kavita-group-1")

        assertFailsWith<ExternalMetadataServerException> {
            server.match.syncByServerId("unknown-kavita-group", ExternalMetadataSeriesRef("1", "Series 1"))
        }
    }

    @Test
    fun `matches syncByServerId resolves the group linked to the given kavita server group`() = runTest {
        val linkedGroupId = addHealthyGroup(linkedServerGroupId = "kavita-group-1")
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val response = server.matches.syncByServerId("kavita-group-1", listOf(ExternalMetadataSeriesRef("1", "Series 1")))

        assertEquals(linkedGroupId, response.serverInfo.groupId)
    }

    // ── match.syncByServerUrl / matches.syncByServerUrl ──────────────────

    @Test
    fun `match syncByServerUrl falls back to the unlinked group when the url is unknown to Server`() = runTest {
        addHealthyGroup() // unlinked
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val response = server.match.syncByServerUrl(kavitaServer, "http://unknown-kavita-url", ExternalMetadataSeriesRef("1", "Series 1"))

        assertEquals("1", response.data?.seriesId)
    }

    @Test
    fun `match syncByServerUrl resolves via the server group linked at the group level`() = runTest {
        val kavitaGroup = kavitaServer.groups.add(NewServerGroup("Kavita", "fake-server", "{}", "/health"))
        kavitaServer.group(kavitaGroup.id).addUrl(NewServerUrl("http://kavita.local", 5000, 0))
        val linkedGroupId = addHealthyGroup(linkedServerGroupId = kavitaGroup.id)
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val response = server.match.syncByServerUrl(kavitaServer, "http://kavita.local", ExternalMetadataSeriesRef("1", "Series 1"))

        assertEquals(linkedGroupId, response.serverInfo.groupId)
    }

    @Test
    fun `matches syncByServerUrl resolves via the server group linked at the group level`() = runTest {
        val kavitaGroup = kavitaServer.groups.add(NewServerGroup("Kavita", "fake-server", "{}", "/health"))
        kavitaServer.group(kavitaGroup.id).addUrl(NewServerUrl("http://kavita.local", 5000, 0))
        val linkedGroupId = addHealthyGroup(linkedServerGroupId = kavitaGroup.id)
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val response = server.matches.syncByServerUrl(kavitaServer, "http://kavita.local", listOf(ExternalMetadataSeriesRef("1", "Series 1")))

        assertEquals(linkedGroupId, response.serverInfo.groupId)
    }

    // ── match.sync / matches.sync (no hint — resolveNoHint, active-group state) ─────────────

    @Test
    fun `match sync throws when nothing can be resolved (no active group, no kavita link, no unlinked group)`() = runTest {
        assertFailsWith<ExternalMetadataServerException> {
            server.match.sync(ExternalMetadataSeriesRef("1", "Series 1"), kavitaServer)
        }
    }

    @Test
    fun `match sync with no active group and no kavita server active resolves via the unlinked pool`() = runTest {
        addHealthyGroup() // unlinked
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val response = server.match.sync(ExternalMetadataSeriesRef("1", "Series 1"), kavitaServer)

        assertEquals("1", response.data?.seriesId)
    }

    @Test
    fun `match sync with a kavita server active resolves the group linked to it, level 1`() = runTest {
        val kavitaGroup = kavitaServer.groups.add(NewServerGroup("Kavita", "fake-server", "{}", "/health"))
        mockServer.enqueue(MockResponse().setResponseCode(200)) // kavitaServer.setActiveGroup's own health check
        kavitaServer.group(kavitaGroup.id).addUrl(NewServerUrl(baseUrl, 5000, 0))
        kavitaServer.setActiveGroup(kavitaGroup.id)
        val linkedGroupId = addHealthyGroup(linkedServerGroupId = kavitaGroup.id)
        mockServer.enqueue(MockResponse().setResponseCode(200)) // level-1 health check
        mockServer.enqueue(MockResponse().setResponseCode(200)) // resolvePlugin's health check for the sync itself

        val response = server.match.sync(ExternalMetadataSeriesRef("1", "Series 1"), kavitaServer)

        assertEquals(linkedGroupId, response.serverInfo.groupId)
        assertEquals(linkedGroupId, server.getActiveGroupId())
    }

    @Test
    fun `match sync reuses the previously activated group on a second call, without re-resolving`() = runTest {
        addHealthyGroup() // unlinked
        mockServer.enqueue(MockResponse().setResponseCode(200)) // level-2 health check on first call
        mockServer.enqueue(MockResponse().setResponseCode(200)) // resolvePlugin's health check for the first sync

        server.match.sync(ExternalMetadataSeriesRef("1", "Series 1"), kavitaServer)
        val activeAfterFirst = server.getActiveGroupId()

        // second call reuses activeGroupId — ActiveUrlSelector's own 15-min cache means no new
        // health check is even needed for the resolvePlugin call itself.
        val response = server.match.sync(ExternalMetadataSeriesRef("2", "Series 2"), kavitaServer)

        assertEquals(activeAfterFirst, server.getActiveGroupId())
        assertEquals("2", response.data?.seriesId)
    }

    @Test
    fun `matches sync with no hint resolves via the unlinked pool`() = runTest {
        addHealthyGroup() // unlinked
        mockServer.enqueue(MockResponse().setResponseCode(200))

        val response = server.matches.sync(listOf(ExternalMetadataSeriesRef("1", "Series 1")), kavitaServer)

        assertEquals(listOf("1"), response.data.map { it?.seriesId })
    }

    // ── network retry (in-group, withUrlRetry) ────────────────────────────────

    @Test
    fun `a network failure retries once within the same group with a freshly reselected URL and succeeds`() = runTest {
        val urlSelector = FakeUrlSelector(baseUrl)
        var failNextFetchMatchesCall = false
        val retryServer = ExternalMetadataServer(
            groupDao,
            urlDao,
            mapOf(
                "fake" to fakeRegistration(
                    onFactory = { _, _, _, plugin ->
                        if (failNextFetchMatchesCall) {
                            plugin.failFetchMatchesWith = IOException("connection refused")
                            failNextFetchMatchesCall = false
                        }
                    },
                ),
            ),
            urlSelector,
            RequestTool(OkHttpClient()),
            Cache(FakeCacheDao()),
        )
        val group = retryServer.groups.add(NewExternalMetadataGroup("My M3", "fake", "{}", "/health"))
        retryServer.group(group.id).addUrl(NewExternalMetadataUrl(baseUrl, 5000, 0))

        failNextFetchMatchesCall = true
        val response = retryServer.matches.syncByGroup(group.id, listOf(ExternalMetadataSeriesRef("1", "Series 1")))

        assertEquals(listOf("1"), response.data.map { it?.seriesId })
        assertEquals(1, urlSelector.invalidateAndReselectCalls)
    }

    @Test
    fun `a network failure that persists after in-group retry propagates the exception`() = runTest {
        val urlSelector = FakeUrlSelector(baseUrl)
        val retryServer = ExternalMetadataServer(
            groupDao,
            urlDao,
            mapOf(
                "fake" to fakeRegistration(
                    onFactory = { _, _, _, plugin ->
                        plugin.failFetchMatchesWith = IOException("still unreachable")
                    },
                ),
            ),
            urlSelector,
            RequestTool(OkHttpClient()),
            Cache(FakeCacheDao()),
        )
        val group = retryServer.groups.add(NewExternalMetadataGroup("My M3", "fake", "{}", "/health"))
        retryServer.group(group.id).addUrl(NewExternalMetadataUrl(baseUrl, 5000, 0))

        assertFailsWith<IOException> {
            retryServer.matches.syncByGroup(group.id, listOf(ExternalMetadataSeriesRef("1", "Series 1")))
        }
        // exactly one retry attempt: the original call plus one reselect-and-retry, no more
        assertEquals(1, urlSelector.invalidateAndReselectCalls)
    }

    // ── group.validateUrls ───────────────────────────────────────────────────

    @Test
    fun `group validateUrls returns the url the selector picked`() = runTest {
        val urlSelector = FakeUrlSelector(baseUrl)
        val validatingServer =
            ExternalMetadataServer(groupDao, urlDao, mapOf("fake" to fakeRegistration()), urlSelector, RequestTool(OkHttpClient()), Cache(FakeCacheDao()))
        val group = validatingServer.groups.add(NewExternalMetadataGroup("My M3", "fake", "{}", "/health"))
        validatingServer.group(group.id).addUrl(NewExternalMetadataUrl(baseUrl, 5000, 0))

        val winner = validatingServer.group(group.id).validateUrls()

        assertEquals(baseUrl, winner.url)
        assertEquals(1, urlSelector.invalidateAndReselectCalls)
    }

    @Test
    fun `group validateUrls throws when no configured url responds`() = runTest {
        val group = server.groups.add(NewExternalMetadataGroup("My M3", "fake", "{}", "/health"))
        server.group(group.id).addUrl(NewExternalMetadataUrl("http://unreachable.invalid", 200, 0))

        assertFailsWith<ExternalMetadataServerException> { server.group(group.id).validateUrls() }
    }

    @Test
    fun `group validateUrls throws when the group has no urls configured`() = runTest {
        val group = server.groups.add(NewExternalMetadataGroup("My M3", "fake", "{}", "/health"))

        assertFailsWith<ExternalMetadataServerException> { server.group(group.id).validateUrls() }
    }
}
