package com.mymangareader.notifications

import com.mymangareader.cache.Cache
import com.mymangareader.core.database.NotificationGroupEntity
import com.mymangareader.core.database.NotificationUrlEntity
import com.mymangareader.core.database.ServerGroupEntity
import com.mymangareader.core.database.ServerUrlEntity
import com.mymangareader.server.Server
import com.mymangareader.tools.network.ActiveUrlSelector
import com.mymangareader.tools.network.RequestTool
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import kotlin.test.assertFailsWith

// Fakes (ServerGroupDao/ServerUrlDao/CacheDao/ServerPlugin, NotificationGroupDao/UrlDao) live in
// ServerTestFakes.kt / NotificationTestFakes.kt, shared across this module's test files.

// ── Tests ──────────────────────────────────────────────────────────────────

class NotificationGroupResolverTest {
    private lateinit var mockServer: MockWebServer
    private lateinit var notificationGroupDao: FakeNotificationGroupDao
    private lateinit var notificationUrlDao: FakeNotificationUrlDao
    private lateinit var server: Server
    private lateinit var serverGroupDao: FakeServerGroupDao
    private lateinit var serverUrlDao: FakeServerUrlDao
    private lateinit var resolver: NotificationGroupResolver

    @Before
    fun setUp() {
        mockServer = MockWebServer()
        mockServer.start()
        notificationGroupDao = FakeNotificationGroupDao()
        notificationUrlDao = FakeNotificationUrlDao()
        serverGroupDao = FakeServerGroupDao()
        serverUrlDao = FakeServerUrlDao()
        val cache = Cache(FakeCacheDao())
        server =
            Server(
                serverGroupDao,
                serverUrlDao,
                mapOf("fake" to fakeRegistration()),
                ActiveUrlSelector(OkHttpClient(), cache),
                RequestTool(OkHttpClient()),
            )
        val urlSelector = ActiveUrlSelector(OkHttpClient(), cache)
        resolver = NotificationGroupResolver(notificationGroupDao, notificationUrlDao, urlSelector, server)
    }

    @After
    fun tearDown() {
        mockServer.shutdown()
    }

    private fun baseUrl() = mockServer.url("/").toString().trimEnd('/')

    private suspend fun activateKavitaGroup(id: String) {
        serverGroupDao.upsert(ServerGroupEntity(id = id, name = "Kavita", providerId = "fake", credentialsJson = "{}", healthCheckPath = "/health"))
        serverUrlDao.upsert(ServerUrlEntity(id = "$id-url", groupId = id, url = baseUrl(), timeoutMs = 5_000, priority = 0))
        mockServer.enqueue(MockResponse().setResponseCode(200).setBody("OK"))
        server.setActiveGroup(id)
    }

    @Test
    fun `resolve com grupo vinculado ao servidor Kavita ativo e saudavel usa esse grupo`() =
        runTest {
            activateKavitaGroup("kavita-1")
            notificationGroupDao.upsert(
                NotificationGroupEntity(id = "linked", name = "Linked", providerId = "ntfy", topic = "chapters", linkedServerGroupId = "kavita-1"),
            )
            notificationUrlDao.upsert(NotificationUrlEntity(id = "u1", groupId = "linked", url = baseUrl(), timeoutMs = 5_000, priority = 0))
            mockServer.enqueue(MockResponse().setResponseCode(200).setBody("OK"))

            val resolved = resolver.resolveActiveUrl()

            assertEquals("chapters", resolved.topic)
        }

    @Test
    fun `resolve sem grupo vinculado usa o pool de grupos sem vinculo`() =
        runTest {
            activateKavitaGroup("kavita-1")
            notificationGroupDao.upsert(
                NotificationGroupEntity(id = "unlinked", name = "Unlinked", providerId = "ntfy", topic = "fallback-topic", linkedServerGroupId = null),
            )
            notificationUrlDao.upsert(NotificationUrlEntity(id = "u1", groupId = "unlinked", url = baseUrl(), timeoutMs = 5_000, priority = 0))
            mockServer.enqueue(MockResponse().setResponseCode(200).setBody("OK"))

            val resolved = resolver.resolveActiveUrl()

            assertEquals("fallback-topic", resolved.topic)
        }

    @Test
    fun `resolve com grupo vinculado mas sem url saudavel cai para o pool sem vinculo`() =
        runTest {
            activateKavitaGroup("kavita-1")
            notificationGroupDao.upsert(
                NotificationGroupEntity(id = "linked", name = "Linked", providerId = "ntfy", topic = "linked-topic", linkedServerGroupId = "kavita-1"),
            )
            notificationUrlDao.upsert(NotificationUrlEntity(id = "u1", groupId = "linked", url = "http://unreachable.invalid", timeoutMs = 200, priority = 0))
            notificationGroupDao.upsert(
                NotificationGroupEntity(id = "unlinked", name = "Unlinked", providerId = "ntfy", topic = "fallback-topic", linkedServerGroupId = null),
            )
            notificationUrlDao.upsert(NotificationUrlEntity(id = "u2", groupId = "unlinked", url = baseUrl(), timeoutMs = 5_000, priority = 0))
            mockServer.enqueue(MockResponse().setResponseCode(200).setBody("OK"))

            val resolved = resolver.resolveActiveUrl()

            assertEquals("fallback-topic", resolved.topic)
        }

    @Test
    fun `resolve lanca quando nenhum grupo tem url saudavel`() =
        runTest {
            notificationGroupDao.upsert(
                NotificationGroupEntity(id = "unlinked", name = "Unlinked", providerId = "ntfy", topic = "fallback-topic", linkedServerGroupId = null),
            )
            notificationUrlDao.upsert(NotificationUrlEntity(id = "u1", groupId = "unlinked", url = "http://unreachable.invalid", timeoutMs = 200, priority = 0))

            assertFailsWith<NotificationGroupResolverException> {
                resolver.resolveActiveUrl()
            }
        }

    @Test
    fun `resolve sem nenhum servidor Kavita ativo usa direto o pool sem vinculo`() =
        runTest {
            notificationGroupDao.upsert(
                NotificationGroupEntity(id = "unlinked", name = "Unlinked", providerId = "ntfy", topic = "fallback-topic", linkedServerGroupId = null),
            )
            notificationUrlDao.upsert(NotificationUrlEntity(id = "u1", groupId = "unlinked", url = baseUrl(), timeoutMs = 5_000, priority = 0))
            mockServer.enqueue(MockResponse().setResponseCode(200).setBody("OK"))

            val resolved = resolver.resolveActiveUrl()

            assertEquals("fallback-topic", resolved.topic)
        }
}
