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
class SeriesSortPrefsDaoTest {

    private lateinit var db: AppDatabase
    private lateinit var dao: SeriesSortPrefsDao

    @Before
    fun setUp() {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        dao = db.seriesSortPrefsDao()
    }

    @After
    fun tearDown() {
        db.close()
    }

    @Test
    fun `get retorna null quando nao ha override para a serie`() = runTest {
        assertNull(dao.get("10"))
    }

    @Test
    fun `upsert grava e get recupera o override`() = runTest {
        dao.upsert(SeriesSortPrefsEntity(seriesId = "10", chapterSortMode = "DESCENDING", chapterSortFixedThreshold = 5.0, chapterSortProgressPercent = 80))

        val result = dao.get("10")

        assertEquals("DESCENDING", result?.chapterSortMode)
        assertEquals(5.0, result?.chapterSortFixedThreshold)
        assertEquals(80, result?.chapterSortProgressPercent)
    }

    @Test
    fun `upsert substitui o override existente da mesma serie`() = runTest {
        dao.upsert(SeriesSortPrefsEntity(seriesId = "10", chapterSortMode = "ASCENDING"))
        dao.upsert(SeriesSortPrefsEntity(seriesId = "10", chapterSortMode = "DESCENDING"))

        assertEquals("DESCENDING", dao.get("10")?.chapterSortMode)
    }

    @Test
    fun `delete remove o override e get volta a retornar null`() = runTest {
        dao.upsert(SeriesSortPrefsEntity(seriesId = "10", chapterSortMode = "DESCENDING"))

        dao.delete("10")

        assertNull(dao.get("10"))
    }

    @Test
    fun `overrides de series diferentes nao se afetam`() = runTest {
        dao.upsert(SeriesSortPrefsEntity(seriesId = "10", chapterSortMode = "ASCENDING"))
        dao.upsert(SeriesSortPrefsEntity(seriesId = "20", chapterSortMode = "DESCENDING"))

        dao.delete("10")

        assertNull(dao.get("10"))
        assertEquals("DESCENDING", dao.get("20")?.chapterSortMode)
    }
}
