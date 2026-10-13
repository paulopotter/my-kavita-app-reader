package com.mymangareader.core.database

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class CacheRetentionDaoTest {
    private lateinit var db: AppDatabase
    private lateinit var cache: CacheDao
    private lateinit var dao: CacheRetentionDao

    @Before
    fun setUp() {
        db =
            Room
                .inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), AppDatabase::class.java)
                .allowMainThreadQueries()
                .build()
        cache = db.cacheDao()
        dao = db.cacheRetentionDao()
    }

    @After
    fun tearDown() {
        db.close()
    }

    private suspend fun put(
        key: String,
        domain: String,
        value: String,
        lastAccessed: Long,
        variant: String = "",
    ) = cache.upsert(
        CacheEntity(
            key = key,
            variant = variant,
            value = value,
            domain = domain,
            cachedAtEpochMs = lastAccessed,
            ttlMs = 1000,
            expiresAtEpochMs = lastAccessed + 1000,
            lastAccessedAtEpochMs = lastAccessed,
        ),
    )

    @Test
    fun `only rows last accessed before the cutoff come back`() =
        runTest {
            put("old", "chapter", """{"id":"1","seriesId":"42"}""", lastAccessed = 100)
            put("new", "chapter", """{"id":"2","seriesId":"42"}""", lastAccessed = 900)

            val rows = dao.rowsLastAccessedBefore(500)

            assertEquals(listOf("old"), rows.map { it.key })
        }

    @Test
    fun `the series id snippet starts right after the field and runs past it`() =
        runTest {
            put("c1:true", "chapter", """{"id":"c1","seriesId":"42","title":"x"}""", lastAccessed = 1)

            val row = dao.rowsLastAccessedBefore(10).single()

            assertEquals("42", row.seriesIdHint!!.substringBefore('"'))
        }

    @Test
    fun `a page row also exposes its image url, other domains do not`() =
        runTest {
            put("c1:0", "page", """{"id":"c1:0","number":0,"url":"http://h/api/img?chapterId=1&page=0","chapter":{"seriesId":"42"}}""", lastAccessed = 1)
            put("s1:false:true", "serial", """{"id":"s1","url":"http://not-an-image"}""", lastAccessed = 1)

            val rows = dao.rowsLastAccessedBefore(10).associateBy { it.key }

            assertEquals("http://h/api/img?chapterId=1&page=0", rows["c1:0"]!!.urlHint!!.substringBefore('"'))
            assertEquals("42", rows["c1:0"]!!.seriesIdHint!!.substringBefore('"'))
            assertNull(rows["s1:false:true"]!!.urlHint)
        }

    @Test
    fun `a row without a series id has a null hint`() =
        runTest {
            put("k", "externalMetadata:match", """{"match":null}""", lastAccessed = 1)

            assertNull(dao.rowsLastAccessedBefore(10).single().seriesIdHint)
        }

    @Test
    fun `deleteAll removes exactly the given rows and leaves the rest`() =
        runTest {
            put("a", "chapter", "{}", lastAccessed = 1)
            put("b", "chapter", "{}", lastAccessed = 1, variant = "full")
            put("keep", "chapter", "{}", lastAccessed = 1)

            val rows = dao.rowsLastAccessedBefore(10)
            dao.deleteAll(rows.filter { it.key != "keep" })

            assertEquals(listOf("keep"), dao.rowsLastAccessedBefore(10).map { it.key })
        }
}
