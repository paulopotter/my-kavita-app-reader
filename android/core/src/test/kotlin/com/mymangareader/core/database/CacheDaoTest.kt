package com.mymangareader.core.database

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class CacheDaoTest {

    private lateinit var db: AppDatabase
    private lateinit var dao: CacheDao

    @Before
    fun setUp() {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        dao = db.cacheDao()
    }

    @After
    fun tearDown() {
        db.close()
    }

    private fun entry(
        key: String,
        variant: String = "",
        domain: String = "page",
        value: String = "{}",
        cachedAtEpochMs: Long = 1_000L,
        expiresAtEpochMs: Long = 2_000L,
        ttlMs: Long = expiresAtEpochMs - cachedAtEpochMs,
        lastAccessedAtEpochMs: Long = cachedAtEpochMs,
    ) = CacheEntity(
        key = key,
        variant = variant,
        value = value,
        domain = domain,
        cachedAtEpochMs = cachedAtEpochMs,
        ttlMs = ttlMs,
        expiresAtEpochMs = expiresAtEpochMs,
        lastAccessedAtEpochMs = lastAccessedAtEpochMs,
    )

    @Test
    fun `getByKey retorna null quando a chave nao existe`() = runTest {
        assertNull(dao.getByKey("missing", ""))
    }

    @Test
    fun `upsert seguido de getByKey retorna a entrada gravada`() = runTest {
        dao.upsert(entry("page:1", value = "\"hello\""))

        val result = dao.getByKey("page:1", "")

        assertEquals("\"hello\"", result?.value)
    }

    @Test
    fun `upsert com a mesma chave e variant substitui a entrada anterior`() = runTest {
        dao.upsert(entry("page:1", value = "old"))
        dao.upsert(entry("page:1", value = "new"))

        assertEquals("new", dao.getByKey("page:1", "")?.value)
    }

    @Test
    fun `mesma key com variants diferentes coexistem sem colidir`() = runTest {
        dao.upsert(entry("c1:true", variant = "full", value = "full-payload"))
        dao.upsert(entry("c1:false", variant = "full", value = "light-payload"))

        assertEquals("full-payload", dao.getByKey("c1:true", "full")?.value)
        assertEquals("light-payload", dao.getByKey("c1:false", "full")?.value)
    }

    @Test
    fun `deleteByKey remove apenas a entrada indicada`() = runTest {
        dao.upsert(entry("page:1"))
        dao.upsert(entry("page:2"))

        dao.deleteByKey("page:1", "")

        assertNull(dao.getByKey("page:1", ""))
        assertTrue(dao.getByKey("page:2", "") != null)
    }

    @Test
    fun `deleteByDomain remove todas as entradas daquele dominio, preservando outros`() = runTest {
        dao.upsert(entry("page:1", domain = "page"))
        dao.upsert(entry("page:2", domain = "page"))
        dao.upsert(entry("chapter:1", domain = "chapter"))

        dao.deleteByDomain("page")

        assertNull(dao.getByKey("page:1", ""))
        assertNull(dao.getByKey("page:2", ""))
        assertTrue(dao.getByKey("chapter:1", "") != null)
    }

    @Test
    fun `deleteByVariant remove todas as entradas daquele dominio e variant, preservando outras variants e dominios`() = runTest {
        dao.upsert(entry("c1:true", domain = "chapter", variant = "full"))
        dao.upsert(entry("c2:true", domain = "chapter", variant = "full"))
        dao.upsert(entry("c1:false", domain = "chapter", variant = "full"))
        dao.upsert(entry("s1:true", domain = "series", variant = "full"))

        dao.deleteByVariant("chapter", "full")

        assertNull(dao.getByKey("c1:true", "full"))
        assertNull(dao.getByKey("c2:true", "full"))
        assertNull(dao.getByKey("c1:false", "full"))
        assertTrue(dao.getByKey("s1:true", "full") != null)
    }

    @Test
    fun `touchLastAccessed atualiza somente a entrada indicada`() = runTest {
        dao.upsert(entry("page:1", lastAccessedAtEpochMs = 1_000L))
        dao.upsert(entry("page:2", lastAccessedAtEpochMs = 1_000L))

        dao.touchLastAccessed("page:1", "", 9_000L)

        assertEquals(9_000L, dao.getByKey("page:1", "")?.lastAccessedAtEpochMs)
        assertEquals(1_000L, dao.getByKey("page:2", "")?.lastAccessedAtEpochMs)
    }

    @Test
    fun `getOlderThan retorna apenas entradas com cachedAt e lastAccessedAt ambos antes do cutoff`() = runTest {
        // Escrita antiga, nunca mais lida — candidata real ao expurgo.
        dao.upsert(entry("stale", cachedAtEpochMs = 1_000L, lastAccessedAtEpochMs = 1_000L))
        // Escrita antiga, mas lida recentemente — não deve ser expurgada.
        dao.upsert(entry("recently-read", cachedAtEpochMs = 1_000L, lastAccessedAtEpochMs = 9_000L))
        // Escrita recente — não deve ser expurgada.
        dao.upsert(entry("fresh", cachedAtEpochMs = 9_000L, lastAccessedAtEpochMs = 9_000L))

        val olderThan = dao.getOlderThan(cutoffEpochMs = 5_000L)

        assertEquals(listOf("stale"), olderThan.map { it.key })
    }

    @Test
    fun `getAllExpired retorna apenas entradas com expiresAtEpochMs menor ou igual a agora`() = runTest {
        dao.upsert(entry("expired", expiresAtEpochMs = 1_000L))
        dao.upsert(entry("boundary", expiresAtEpochMs = 2_000L))
        dao.upsert(entry("fresh", expiresAtEpochMs = 5_000L))

        val expired = dao.getAllExpired(nowEpochMs = 2_000L)

        assertEquals(setOf("expired", "boundary"), expired.map { it.key }.toSet())
    }

    @Test
    fun `deleteExpired remove multiplas entradas de uma vez, respeitando key e variant`() = runTest {
        dao.upsert(entry("a"))
        dao.upsert(entry("b"))
        dao.upsert(entry("c:true", variant = "full"))
        dao.upsert(entry("c:false", variant = "full"))

        dao.deleteExpired(listOf(entry("a"), entry("c:true", variant = "full")))

        assertNull(dao.getByKey("a", ""))
        assertTrue(dao.getByKey("b", "") != null)
        assertNull(dao.getByKey("c:true", "full"))
        assertTrue(dao.getByKey("c:false", "full") != null)
    }

    // ── queryFiltered — the batch read behind CacheStore.patchAll (the CacheFilter sugar over it
    //    lives in :cache and is covered by CachePatchTest) ──────────────────────

    @Test
    fun `queryFiltered with hasKeys 0 and null domain,variant returns every row`() = runTest {
        dao.upsert(entry("a", domain = "serial"))
        dao.upsert(entry("b", domain = "chapter", variant = "full"))

        assertEquals(
            setOf("a", "b"),
            dao.queryFiltered(keys = emptyList(), hasKeys = 0, domain = null, variant = null).map { it.key }.toSet(),
        )
    }

    @Test
    fun `queryFiltered ANDs keys, domain and variant`() = runTest {
        dao.upsert(entry("s1", domain = "serial", variant = "v"))
        dao.upsert(entry("s2", domain = "serial", variant = "v"))
        dao.upsert(entry("s3", domain = "serial", variant = "other"))
        dao.upsert(entry("c1", domain = "chapter", variant = "v"))

        assertEquals(
            setOf("s1", "s2"),
            dao.queryFiltered(listOf("s1", "s2", "s3"), hasKeys = 1, domain = "serial", variant = "v").map { it.key }.toSet(),
        )
        assertEquals(
            setOf("s1", "s2", "s3"),
            dao.queryFiltered(emptyList(), hasKeys = 0, domain = "serial", variant = null).map { it.key }.toSet(),
        )
        assertEquals(
            setOf("s1", "s2", "c1"),
            dao.queryFiltered(emptyList(), hasKeys = 0, domain = null, variant = "v").map { it.key }.toSet(),
        )
    }

    @Test
    fun `upsertAllLenient writes every row and returns the count`() = runTest {
        val written = dao.upsertAllLenient(
            listOf(entry("a", value = "1"), entry("b", value = "2"), entry("c", variant = "full", value = "3")),
        )

        assertEquals(3, written)
        assertEquals("1", dao.getByKey("a", "")?.value)
        assertEquals("2", dao.getByKey("b", "")?.value)
        assertEquals("3", dao.getByKey("c", "full")?.value)
    }

    @Test
    fun `upsertAllLenient replaces an existing row (same key,variant)`() = runTest {
        dao.upsert(entry("a", value = "old"))
        dao.upsertAllLenient(listOf(entry("a", value = "new")))
        assertEquals("new", dao.getByKey("a", "")?.value)
    }
}
