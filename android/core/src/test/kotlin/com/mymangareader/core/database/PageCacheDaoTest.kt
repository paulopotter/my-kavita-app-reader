package com.mymangareader.core.database

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PageCacheDaoTest {

    private lateinit var db: AppDatabase
    private lateinit var dao: PageCacheDao

    @Before
    fun setUp() {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        dao = db.pageCacheDao()
    }

    @After
    fun tearDown() {
        db.close()
    }

    @Test
    fun `getByChapterId retorna vazio quando nao ha cache`() = runTest {
        assertTrue(dao.getByChapterId("c1").isEmpty())
    }

    @Test
    fun `replaceForChapter insere paginas ordenadas por pageIndex`() = runTest {
        dao.replaceForChapter(
            "c1",
            listOf(
                PageCacheEntity("c1", 1, "url1", 1000),
                PageCacheEntity("c1", 0, "url0", 1000),
            ),
        )

        val pages = dao.getByChapterId("c1")

        assertEquals(listOf(0, 1), pages.map { it.pageIndex })
    }

    @Test
    fun `replaceForChapter substitui em vez de acumular`() = runTest {
        dao.replaceForChapter("c1", listOf(PageCacheEntity("c1", 0, "old", 1000)))

        dao.replaceForChapter("c1", listOf(PageCacheEntity("c1", 0, "new", 2000)))

        val pages = dao.getByChapterId("c1")
        assertEquals(1, pages.size)
        assertEquals("new", pages.first().url)
    }

    @Test
    fun `countByChapterId reflete numero de paginas cacheadas`() = runTest {
        dao.replaceForChapter(
            "c1",
            listOf(
                PageCacheEntity("c1", 0, "url0", 1000),
                PageCacheEntity("c1", 1, "url1", 1000),
            ),
        )

        assertEquals(2, dao.countByChapterId("c1"))
        assertEquals(0, dao.countByChapterId("c2"))
    }
}
