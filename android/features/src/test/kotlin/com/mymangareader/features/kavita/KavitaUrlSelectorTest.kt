package com.mymangareader.features.kavita

import com.mymangareader.core.database.ServerConfigDao
import com.mymangareader.core.database.ServerConfigEntity
import com.mymangareader.tools.network.UrlCandidate
import com.mymangareader.tools.network.UrlSelector
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

private class FakeServerConfigDao(private val entries: List<ServerConfigEntity> = emptyList()) : ServerConfigDao {
    override suspend fun upsert(entity: ServerConfigEntity) = Unit
    override suspend fun delete(entity: ServerConfigEntity) = Unit
    override fun observeAll(): Flow<List<ServerConfigEntity>> = MutableStateFlow(entries)
    override suspend fun getAll(): List<ServerConfigEntity> = entries
    override suspend fun deleteById(id: String) = Unit
}

private class FakeUrlSelector(private val result: Result<String>) : UrlSelector {
    override suspend fun getActiveUrl(candidates: List<UrlCandidate>): Result<String> = result
    override suspend fun invalidateAndReselect(candidates: List<UrlCandidate>): Result<String> = result
    override fun getLastKnownUrl(): String? = result.getOrNull()
}

class KavitaUrlSelectorTest {

    @Test
    fun `getActiveUrl returns success from underlying selector`() = runTest {
        val entity = ServerConfigEntity("s1", "http://kavita", 5000, 0, "/api/health")
        val selector = KavitaUrlSelector(
            FakeServerConfigDao(listOf(entity)),
            FakeUrlSelector(Result.success("http://kavita")),
        )

        val result = selector.getActiveUrl()
        assertTrue(result.isSuccess)
        assertEquals("http://kavita", result.getOrThrow())
    }

    @Test
    fun `getActiveUrl returns failure when selector fails`() = runTest {
        val selector = KavitaUrlSelector(
            FakeServerConfigDao(listOf(ServerConfigEntity("s1", "http://kavita", 100, 0, "/health"))),
            FakeUrlSelector(Result.failure(IllegalStateException("No response"))),
        )

        val result = selector.getActiveUrl()
        assertTrue(result.isFailure)
    }

    @Test
    fun `getActiveUrl returns failure when no servers configured`() = runTest {
        val selector = KavitaUrlSelector(
            FakeServerConfigDao(emptyList()),
            FakeUrlSelector(Result.failure(IllegalStateException("No candidates"))),
        )

        val result = selector.getActiveUrl()
        assertTrue(result.isFailure)
    }

    @Test
    fun `getLastKnownUrl reflects selector state`() = runTest {
        val selector = KavitaUrlSelector(
            FakeServerConfigDao(emptyList()),
            FakeUrlSelector(Result.success("http://last-known")),
        )
        assertEquals("http://last-known", selector.getLastKnownUrl())
    }
}
