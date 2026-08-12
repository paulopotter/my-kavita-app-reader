package com.mymangareader.features.startup

import com.mymangareader.core.database.AuthConfigDao
import com.mymangareader.core.database.AuthConfigEntity
import com.mymangareader.core.database.BffMatchDao
import com.mymangareader.core.database.BffMatchEntity
import com.mymangareader.core.database.BffServerConfigDao
import com.mymangareader.core.database.BffServerConfigEntity
import com.mymangareader.core.database.ChapterCacheDao
import com.mymangareader.core.database.ChapterCacheEntity
import com.mymangareader.core.database.FollowedSeriesDao
import com.mymangareader.core.database.FollowedSeriesEntity
import com.mymangareader.core.database.ReadingProgressDao
import com.mymangareader.core.database.ReadingProgressEntity
import com.mymangareader.core.database.ServerConfigDao
import com.mymangareader.core.database.ServerConfigEntity
import com.mymangareader.core.database.UiPreferencesDao
import com.mymangareader.core.database.UiPreferencesEntity
import com.mymangareader.features.bff.BffFeature
import com.mymangareader.features.kavita.KavitaSeriesFeature
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

// ── Fakes ─────────────────────────────────────────────────────────────────────

private class FakeUiPreferencesDao(
    var entity: UiPreferencesEntity? = null,
) : UiPreferencesDao {
    var upserted: UiPreferencesEntity? = null
    override suspend fun get() = entity
    override suspend fun upsert(e: UiPreferencesEntity) { upserted = e; entity = e }
    override fun observe(): Flow<UiPreferencesEntity?> = MutableStateFlow(entity)
}

private class FakeFollowedSeriesDao : FollowedSeriesDao {
    override suspend fun getAllIds() = emptyList<String>()
    override suspend fun isFollowed(seriesId: String) = false
    override suspend fun follow(entity: FollowedSeriesEntity) {}
    override suspend fun unfollow(seriesId: String) {}
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

private class FakeAuthConfigDao : AuthConfigDao {
    override suspend fun get(): AuthConfigEntity? = null
    override suspend fun upsert(entity: AuthConfigEntity) {}
    override fun observe(): Flow<AuthConfigEntity?> = MutableStateFlow(null)
}

private class FakeUrlSource(private val url: String) : KavitaUrlSource {
    override suspend fun getActiveUrl() = Result.success(url)
    override suspend fun invalidateAndReselect() = Result.success(url)
    override fun getLastKnownUrl(): String? = url
}

private class FakeBffMatchDao : BffMatchDao {
    override suspend fun getAll() = emptyList<BffMatchEntity>()
    override suspend fun getBySeriesId(seriesId: String): BffMatchEntity? = null
    override suspend fun insertAll(matches: List<BffMatchEntity>) {}
    override suspend fun deleteAll() {}
}

private class FakeBffServerConfigDao : BffServerConfigDao {
    override suspend fun getAll() = emptyList<BffServerConfigEntity>()
    override suspend fun insert(entity: BffServerConfigEntity) {}
    override suspend fun deleteById(id: String) {}
}

private class FakeServerConfigDao : ServerConfigDao {
    override suspend fun getAll() = emptyList<ServerConfigEntity>()
    override suspend fun upsert(entity: ServerConfigEntity) {}
    override suspend fun delete(entity: ServerConfigEntity) {}
    override suspend fun deleteById(id: String) {}
    override fun observeAll(): Flow<List<ServerConfigEntity>> = MutableStateFlow(emptyList())
}

private class FakeReadingProgressDao : ReadingProgressDao {
    override suspend fun get(chapterId: String): ReadingProgressEntity? = null
    override suspend fun upsert(entity: ReadingProgressEntity) {}
}

// ── Testes ────────────────────────────────────────────────────────────────────

class SplashSyncCoordinatorTest {

    private lateinit var server: MockWebServer
    private lateinit var uiPrefsDao: FakeUiPreferencesDao

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        uiPrefsDao = FakeUiPreferencesDao()
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    private fun makeCoordinator(): SplashSyncCoordinator {
        val baseUrl = server.url("/").toString()
        val requestTool = RequestTool(OkHttpClient())
        val kavitaFeature = KavitaSeriesFeature(
            urlSource = FakeUrlSource(baseUrl),
            requestTool = requestTool,
            authConfigDao = FakeAuthConfigDao(),
            chapterCacheDao = FakeChapterCacheDao(),
            bffMatchDao = FakeBffMatchDao(),
            readingProgressDao = FakeReadingProgressDao(),
        )
        val bffFeature = BffFeature(
            requestTool = requestTool,
            bffServerConfigDao = FakeBffServerConfigDao(),
            serverConfigDao = FakeServerConfigDao(),
            bffMatchDao = FakeBffMatchDao(),
        )
        return SplashSyncCoordinator(
            kavitaSeriesFeature = kavitaFeature,
            bffFeature = bffFeature,
            followedSeriesDao = FakeFollowedSeriesDao(),
            chapterCacheDao = FakeChapterCacheDao(),
            uiPreferencesDao = uiPrefsDao,
        )
    }

    @Test
    fun `pula sync e emite 0_9 quando lastSuccessfulSyncAtMs esta dentro de 5 min`() = runTest {
        uiPrefsDao.entity = UiPreferencesEntity(
            lastSuccessfulSyncAtMs = System.currentTimeMillis() - 60_000L,
        )

        val coordinator = makeCoordinator()
        val result = coordinator.sync()

        assertTrue(result)
        assertEquals(0.9f, coordinator.progress.value)
        assertNull("nao deve gravar upsert", uiPrefsDao.upserted)
        assertEquals("nao deve fazer requisicao HTTP", 0, server.requestCount)
    }

    @Test
    fun `pula sync quando falta apenas 1 s para expirar a janela`() = runTest {
        uiPrefsDao.entity = UiPreferencesEntity(
            lastSuccessfulSyncAtMs = System.currentTimeMillis() - (5 * 60 * 1000L - 1_000L),
        )

        val coordinator = makeCoordinator()
        coordinator.sync()

        assertEquals(0, server.requestCount)
    }

    @Test
    fun `executa sync quando nao ha lastSuccessfulSyncAtMs`() = runTest {
        uiPrefsDao.entity = null

        val coordinator = makeCoordinator()
        coordinator.sync()

        // Sync executou até o fim (progresso 0.9) mesmo com falha de auth
        assertEquals(0.9f, coordinator.progress.value)
    }

    @Test
    fun `executa sync quando janela expirou ha mais de 5 min`() = runTest {
        uiPrefsDao.entity = UiPreferencesEntity(
            lastSuccessfulSyncAtMs = System.currentTimeMillis() - (6 * 60 * 1000L),
        )

        val coordinator = makeCoordinator()
        coordinator.sync()

        assertEquals(0.9f, coordinator.progress.value)
    }

    @Test
    fun `progress comeca em 0 antes de qualquer sync`() = runTest {
        assertEquals(0f, makeCoordinator().progress.value)
    }

    @Test
    fun `progress vai para 0_9 quando sync e pulada por janela recente`() = runTest {
        uiPrefsDao.entity = UiPreferencesEntity(
            lastSuccessfulSyncAtMs = System.currentTimeMillis() - 30_000L,
        )
        val coordinator = makeCoordinator()
        coordinator.sync()
        assertEquals(0.9f, coordinator.progress.value)
    }
}
