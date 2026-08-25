package com.mymangareader

import com.facebook.react.bridge.ReactApplicationContext
import com.mymangareader.core.database.ServerGroupDao
import com.mymangareader.core.database.ServerGroupEntity
import com.mymangareader.core.database.ServerUrlDao
import com.mymangareader.core.database.ServerUrlEntity
import com.mymangareader.externalmetadataserver.ExternalMetadataServer
import com.mymangareader.server.Server
import com.mymangareader.tools.network.ActiveUrlSelector
import com.mymangareader.tools.network.RequestTool
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import okhttp3.OkHttpClient
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mockito.kotlin.mock

// buildPageDigest/buildChapterDigest/buildSeriesDigest (:content-digest) each wrap their own
// Server calls in try/catch and return a Failure value instead of ever rethrowing (see each
// function's own doc — this is deliberate: an expected failure is data, not an exception). That
// means DigestBridgeModule's own runCatching { ... }.resolveOrReject(...) never actually reaches
// its reject branch in normal use — every outcome, success or Failure, is a *resolved* Promise
// carrying `{isSuccess, ...}` (see DigestBridgeMappers.kt). There is no reachable "genuine
// exception" path to test from here without breaking the very invariant that makes this module
// simple, and the resolve path itself can't run under a plain JVM test (every toWritableMap() call
// hits Arguments.createMap(), which needs the native reactnativejni lib — same limitation already
// documented in ReaderChapterModuleTest.kt/NetworkStatusModuleTest.kt for ServerBridgeModule).
// So the only thing left to verify here is wiring — getName() — with the resolve/reject behavior
// itself covered by the manual real-server smoke test (see project_kavita_real_server memory).
private class FakeServerGroupDao : ServerGroupDao {
    override suspend fun upsert(entity: ServerGroupEntity) = Unit
    override suspend fun delete(entity: ServerGroupEntity) = Unit
    override fun observeAll(): Flow<List<ServerGroupEntity>> = MutableStateFlow(emptyList())
    override suspend fun getAll(): List<ServerGroupEntity> = emptyList()
    override suspend fun getById(id: String): ServerGroupEntity? = null
    override suspend fun deleteById(id: String) = Unit
}

private class FakeServerUrlDao : ServerUrlDao {
    override suspend fun upsert(entity: ServerUrlEntity) = Unit
    override suspend fun delete(entity: ServerUrlEntity) = Unit
    override fun observeByGroupId(groupId: String): Flow<List<ServerUrlEntity>> = MutableStateFlow(emptyList())
    override suspend fun getByGroupId(groupId: String): List<ServerUrlEntity> = emptyList()
    override suspend fun getById(id: String): ServerUrlEntity? = null
    override suspend fun deleteById(id: String) = Unit
    override suspend fun deleteByGroupId(groupId: String) = Unit
}

class DigestBridgeModuleTest {

    @Test
    fun `getName retorna DigestBridgeModule`() {
        val server = Server(FakeServerGroupDao(), FakeServerUrlDao(), emptyMap(), ActiveUrlSelector(OkHttpClient()), RequestTool(OkHttpClient()))
        val module = DigestBridgeModule(server, mock<ExternalMetadataServer>(), mock<ReactApplicationContext>())

        assertEquals("DigestBridgeModule", module.name)
    }
}
