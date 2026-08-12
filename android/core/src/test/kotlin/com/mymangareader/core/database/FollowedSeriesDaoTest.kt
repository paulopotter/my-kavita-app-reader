package com.mymangareader.core.database

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class FollowedSeriesDaoTest {

    private lateinit var db: AppDatabase
    private lateinit var dao: FollowedSeriesDao

    @Before
    fun setUp() {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        dao = db.followedSeriesDao()
    }

    @After
    fun tearDown() {
        db.close()
    }

    @Test
    fun `observeAllIds emite lista vazia inicialmente`() = runTest {
        assertTrue(dao.observeAllIds().first().isEmpty())
    }

    @Test
    fun `observeAllIds emite nova lista apos follow`() = runTest {
        dao.follow(FollowedSeriesEntity(seriesId = "10", followedAtMs = 1L))

        val ids = dao.observeAllIds().first()

        assertEquals(listOf("10"), ids)
    }

    @Test
    fun `observeAllIds emite lista atualizada apos toggle remover`() = runTest {
        dao.follow(FollowedSeriesEntity(seriesId = "10", followedAtMs = 1L))
        dao.toggle("10")

        val ids = dao.observeAllIds().first()

        assertTrue(ids.isEmpty())
    }
}
