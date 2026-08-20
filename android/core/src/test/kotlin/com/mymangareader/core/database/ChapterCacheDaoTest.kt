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
class ChapterCacheDaoTest {

    private lateinit var db: AppDatabase
    private lateinit var dao: ChapterCacheDao

    @Before
    fun setUp() {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        dao = db.chapterCacheDao()
    }

    @After
    fun tearDown() {
        db.close()
    }

    private fun chapter(id: String, seriesId: String, number: String) = ChapterCacheEntity(
        id = id,
        seriesId = seriesId,
        title = "Cap $number",
        number = number,
        pageCount = 20,
        sortOrder = number.toDouble(),
        readStatus = "UNREAD",
        pagesRead = 0,
        updatedAtLocalMs = null,
    )

    @Test
    fun `replaceForSeries substitui capitulos antigos em vez de acumular`() = runTest {
        dao.insertAll(listOf(chapter("1", "10", "1"), chapter("2", "10", "2")))

        dao.replaceForSeries("10", listOf(chapter("3", "10", "3")))

        val result = dao.getBySeriesId("10")
        assertEquals(1, result.size)
        assertEquals("3", result[0].id)
    }

    @Test
    fun `replaceForSeries nao afeta capitulos de outra serie`() = runTest {
        dao.insertAll(listOf(chapter("1", "10", "1"), chapter("99", "20", "1")))

        dao.replaceForSeries("10", listOf(chapter("2", "10", "2")))

        assertEquals(1, dao.getBySeriesId("20").size)
        assertTrue(dao.getBySeriesId("20").any { it.id == "99" })
    }

    @Test
    fun `replaceForSeries com lista vazia limpa capitulos da serie`() = runTest {
        dao.insertAll(listOf(chapter("1", "10", "1")))

        dao.replaceForSeries("10", emptyList())

        assertTrue(dao.getBySeriesId("10").isEmpty())
    }

    @Test
    fun `getBySeriesId retorna capitulos ordenados por sortOrder, independente da ordem de insercao`() = runTest {
        dao.insertAll(
            listOf(
                chapter("3", "10", "3"),
                chapter("1", "10", "1"),
                chapter("2", "10", "2"),
            ),
        )

        val result = dao.getBySeriesId("10")

        assertEquals(listOf("1", "2", "3"), result.map { it.id })
    }
}
