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
        domain: String = "page",
        value: String = "{}",
        cachedAtEpochMs: Long = 1_000L,
        expiresAtEpochMs: Long = 2_000L,
    ) = CacheEntity(
        key = key,
        value = value,
        domain = domain,
        cachedAtEpochMs = cachedAtEpochMs,
        expiresAtEpochMs = expiresAtEpochMs,
    )

    @Test
    fun `getByKey retorna null quando a chave nao existe`() = runTest {
        assertNull(dao.getByKey("missing"))
    }

    @Test
    fun `upsert seguido de getByKey retorna a entrada gravada`() = runTest {
        dao.upsert(entry("page:1", value = "\"hello\""))

        val result = dao.getByKey("page:1")

        assertEquals("\"hello\"", result?.value)
    }

    @Test
    fun `upsert com a mesma chave substitui a entrada anterior`() = runTest {
        dao.upsert(entry("page:1", value = "old"))
        dao.upsert(entry("page:1", value = "new"))

        assertEquals("new", dao.getByKey("page:1")?.value)
    }

    @Test
    fun `deleteByKey remove apenas a entrada indicada`() = runTest {
        dao.upsert(entry("page:1"))
        dao.upsert(entry("page:2"))

        dao.deleteByKey("page:1")

        assertNull(dao.getByKey("page:1"))
        assertTrue(dao.getByKey("page:2") != null)
    }

    @Test
    fun `deleteByDomain remove todas as entradas daquele dominio, preservando outros`() = runTest {
        dao.upsert(entry("page:1", domain = "page"))
        dao.upsert(entry("page:2", domain = "page"))
        dao.upsert(entry("chapter:1", domain = "chapter"))

        dao.deleteByDomain("page")

        assertNull(dao.getByKey("page:1"))
        assertNull(dao.getByKey("page:2"))
        assertTrue(dao.getByKey("chapter:1") != null)
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
    fun `deleteByKeys remove multiplas entradas de uma vez`() = runTest {
        dao.upsert(entry("a"))
        dao.upsert(entry("b"))
        dao.upsert(entry("c"))

        dao.deleteByKeys(listOf("a", "c"))

        assertNull(dao.getByKey("a"))
        assertTrue(dao.getByKey("b") != null)
        assertNull(dao.getByKey("c"))
    }
}
