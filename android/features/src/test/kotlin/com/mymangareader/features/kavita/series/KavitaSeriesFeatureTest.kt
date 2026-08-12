package com.mymangareader.features.kavita.series

import com.mymangareader.core.database.AuthConfigDao
import com.mymangareader.core.database.AuthConfigEntity
import com.mymangareader.core.database.BffMatchDao
import com.mymangareader.core.database.BffMatchEntity
import com.mymangareader.core.database.ChapterCacheDao
import com.mymangareader.core.database.ChapterCacheEntity
import com.mymangareader.features.kavita.KavitaUrlSource
import com.mymangareader.tools.network.RequestTool
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

// ── Fakes ─────────────────────────────────────────────────────────────────────

private class FakeAuthConfigDao(private var stored: AuthConfigEntity?) : AuthConfigDao {
    override suspend fun get(): AuthConfigEntity? = stored
    override suspend fun upsert(entity: AuthConfigEntity) { stored = entity }
    override fun observe(): Flow<AuthConfigEntity?> = MutableStateFlow(stored)
}

private class FakeUrlSource(private val url: String) : KavitaUrlSource {
    override suspend fun getActiveUrl() = Result.success(url)
    override suspend fun invalidateAndReselect() = Result.success(url)
    override fun getLastKnownUrl(): String? = url
}

private class FakeChapterCacheDao : ChapterCacheDao {
    override suspend fun getBySeriesId(seriesId: String) = emptyList<ChapterCacheEntity>()
    override suspend fun updateReadStatus(
        chapterId: String,
        readStatus: String,
        pagesRead: Int,
        updatedAtLocalMs: Long,
    ) {}
    override suspend fun insertAll(chapters: List<ChapterCacheEntity>) {}
    override suspend fun deleteBySeriesId(seriesId: String) {}
}

private class FakeBffMatchDao : BffMatchDao {
    override suspend fun getAll() = emptyList<BffMatchEntity>()
    override suspend fun getBySeriesId(seriesId: String): BffMatchEntity? = null
    override suspend fun insertAll(matches: List<BffMatchEntity>) {}
    override suspend fun deleteAll() {}
}

// ── Testes ────────────────────────────────────────────────────────────────────

class KavitaSeriesFeatureTest {

    private lateinit var server: MockWebServer
    private lateinit var authDao: FakeAuthConfigDao
    private lateinit var feature: KavitaSeriesFeature

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        authDao = FakeAuthConfigDao(AuthConfigEntity(jwt = "jwt-token", apiKey = "api-key"))
        val baseUrl = server.url("/").toString().trimEnd('/')
        feature = KavitaSeriesFeature(
            urlSource = FakeUrlSource(baseUrl),
            requestTool = RequestTool(OkHttpClient()),
            authConfigDao = authDao,
            chapterCacheDao = FakeChapterCacheDao(),
            bffMatchDao = FakeBffMatchDao(),
        )
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `getSeriesDetail retorna detalhe da serie em caso de sucesso`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"id":42,"name":"One Piece"}""",
            ),
        )

        val result = feature.getSeriesDetail("42")

        assertTrue(result.isSuccess)
        val detail = result.getOrThrow()
        assertEquals("42", detail.id)
        assertEquals("One Piece", detail.name)
        assertTrue(detail.coverImageUrl.contains("seriesId=42"))
    }

    @Test
    fun `getSeriesDetail retorna failure em erro HTTP`() = runTest {
        server.enqueue(MockResponse().setResponseCode(404))

        val result = feature.getSeriesDetail("42")

        assertTrue(result.isFailure)
    }

    @Test
    fun `getSeriesDetail retorna failure quando nao autenticado`() = runTest {
        authDao.upsert(AuthConfigEntity(apiKey = "api-key", jwt = null))

        val result = feature.getSeriesDetail("42")

        assertTrue(result.isFailure)
        assertEquals(0, server.requestCount)
    }

    @Test
    fun `getSeriesMetadata retorna summary, generos e tags em caso de sucesso`() = runTest {
        server.enqueue(
            MockResponse().setResponseCode(200).setBody(
                """{"seriesId":42,"summary":"Piratas em busca de tesouro","genres":[{"id":1,"title":"Aventura"},{"id":2,"title":"Fantasia"}],"tags":[{"id":3,"title":"Piratas"}]}""",
            ),
        )

        val result = feature.getSeriesMetadata("42")

        assertTrue(result.isSuccess)
        val metadata = result.getOrThrow()
        assertEquals("Piratas em busca de tesouro", metadata.summary)
        assertEquals(listOf("Aventura", "Fantasia"), metadata.genres)
        assertEquals(listOf("Piratas"), metadata.tags)
    }

    @Test
    fun `getSeriesMetadata usa seriesId como query param`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"seriesId":42}"""))

        feature.getSeriesMetadata("42")

        assertEquals("/api/Series/metadata?seriesId=42", server.takeRequest().path)
    }

    @Test
    fun `getSeriesMetadata retorna summary nulo e listas vazias quando campos ausentes`() = runTest {
        server.enqueue(MockResponse().setResponseCode(200).setBody("""{"seriesId":42}"""))

        val result = feature.getSeriesMetadata("42")

        assertEquals(null, result.getOrThrow().summary)
        assertTrue(result.getOrThrow().genres.isEmpty())
        assertTrue(result.getOrThrow().tags.isEmpty())
    }

    @Test
    fun `getSeriesMetadata retorna failure em erro HTTP`() = runTest {
        server.enqueue(MockResponse().setResponseCode(500))

        val result = feature.getSeriesMetadata("42")

        assertTrue(result.isFailure)
    }
}
