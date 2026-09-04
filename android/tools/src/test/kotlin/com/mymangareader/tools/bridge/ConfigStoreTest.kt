package com.mymangareader.tools.bridge

import com.mymangareader.core.database.AuthConfigDao
import com.mymangareader.core.database.AuthConfigEntity
import com.mymangareader.core.database.BffServerConfigDao
import com.mymangareader.core.database.BffServerConfigEntity
import com.mymangareader.core.database.ServerConfigDao
import com.mymangareader.core.database.ServerConfigEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

// ── Fakes ──────────────────────────────────────────────────────────────────────

internal class FakeServerConfigDao : ServerConfigDao {
    private val store = mutableMapOf<String, ServerConfigEntity>()
    private val _flow = MutableStateFlow<List<ServerConfigEntity>>(emptyList())

    override suspend fun upsert(entity: ServerConfigEntity) {
        store[entity.id] = entity
        _flow.value = store.values.sortedBy { it.priority }
    }
    override suspend fun delete(entity: ServerConfigEntity) { store.remove(entity.id); _flow.value = store.values.toList() }
    override fun observeAll(): Flow<List<ServerConfigEntity>> = _flow.asStateFlow()
    override suspend fun getAll(): List<ServerConfigEntity> = store.values.sortedBy { it.priority }
    override suspend fun deleteById(id: String) { store.remove(id); _flow.value = store.values.toList() }
}

internal class FakeAuthConfigDao : AuthConfigDao {
    private var stored: AuthConfigEntity? = null
    private val _flow = MutableStateFlow<AuthConfigEntity?>(null)

    override suspend fun upsert(entity: AuthConfigEntity) { stored = entity; _flow.value = entity }
    override fun observe(): Flow<AuthConfigEntity?> = _flow.asStateFlow()
    override suspend fun get(): AuthConfigEntity? = stored
}

internal class FakeBffServerConfigDao : BffServerConfigDao {
    private val store = mutableMapOf<String, BffServerConfigEntity>()
    override suspend fun getAll() = store.values.toList()
    override suspend fun insert(entity: BffServerConfigEntity) { store[entity.id] = entity }
    override suspend fun deleteById(id: String) { store.remove(id) }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

class ConfigStoreTest {

    private lateinit var serverDao: FakeServerConfigDao
    private lateinit var authDao: FakeAuthConfigDao
    private lateinit var bffDao: FakeBffServerConfigDao
    private lateinit var store: ConfigStore

    @Before
    fun setUp() {
        serverDao = FakeServerConfigDao()
        authDao = FakeAuthConfigDao()
        bffDao = FakeBffServerConfigDao()
        store = ConfigStore(serverDao, authDao, bffDao)
    }

    // ── Server config ──────────────────────────────────────────────────────────

    @Test
    fun `getServerConfigs returns empty list initially`() = runTest {
        assertEquals(emptyList<ServerConfigEntity>(), store.getServerConfigs())
    }

    @Test
    fun `upsertServerConfig stores and retrieves entity`() = runTest {
        val entity = ServerConfigEntity("s1", "http://server1", 5000, 0, "/health")
        store.upsertServerConfig(entity)

        val list = store.getServerConfigs()
        assertEquals(1, list.size)
        assertEquals(entity, list.first())
    }

    @Test
    fun `deleteServerConfig removes entity by id`() = runTest {
        store.upsertServerConfig(ServerConfigEntity("s1", "http://server1", 5000, 0, "/health"))
        store.upsertServerConfig(ServerConfigEntity("s2", "http://server2", 5000, 1, "/health"))

        store.deleteServerConfig("s1")

        val list = store.getServerConfigs()
        assertEquals(1, list.size)
        assertEquals("s2", list.first().id)
    }

    @Test
    fun `upsert replaces existing server config with same id`() = runTest {
        store.upsertServerConfig(ServerConfigEntity("s1", "http://old", 5000, 0, "/health"))
        store.upsertServerConfig(ServerConfigEntity("s1", "http://new", 3000, 1, "/ping"))

        val list = store.getServerConfigs()
        assertEquals(1, list.size)
        assertEquals("http://new", list.first().url)
    }

    // ── Auth config ────────────────────────────────────────────────────────────

    @Test
    fun `getAuthConfig returns null initially`() = runTest {
        assertNull(store.getAuthConfig())
    }

    @Test
    fun `upsertAuthConfig stores and retrieves entity`() = runTest {
        store.upsertAuthConfig(AuthConfigEntity(apiKey = "key-123", jwt = "token-abc"))

        val auth = store.getAuthConfig()
        assertEquals("key-123", auth?.apiKey)
        assertEquals("token-abc", auth?.jwt)
    }

    @Test
    fun `upsertAuthConfig overwrites previous entry`() = runTest {
        store.upsertAuthConfig(AuthConfigEntity(apiKey = "old-key"))
        store.upsertAuthConfig(AuthConfigEntity(apiKey = "new-key"))

        assertEquals("new-key", store.getAuthConfig()?.apiKey)
    }
}
