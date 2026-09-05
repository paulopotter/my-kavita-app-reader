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
class NotificationUrlDaoTest {
    private lateinit var db: AppDatabase
    private lateinit var dao: NotificationUrlDao

    @Before
    fun setUp() {
        db =
            Room
                .inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), AppDatabase::class.java)
                .allowMainThreadQueries()
                .build()
        dao = db.notificationUrlDao()
    }

    @After
    fun tearDown() {
        db.close()
    }

    private fun entity(
        id: String,
        groupId: String = "g1",
        url: String = "https://ntfy.example",
        timeoutMs: Int = 8_000,
        priority: Int = 0,
    ) = NotificationUrlEntity(id = id, groupId = groupId, url = url, timeoutMs = timeoutMs, priority = priority)

    @Test
    fun `getById retorna null quando a url nao existe`() =
        runTest {
            assertNull(dao.getById("missing"))
        }

    @Test
    fun `upsert seguido de getById retorna a url gravada`() =
        runTest {
            dao.upsert(entity("u1", url = "https://lan.local"))

            assertEquals("https://lan.local", dao.getById("u1")?.url)
        }

    @Test
    fun `getByGroupId retorna as urls do grupo ordenadas por priority`() =
        runTest {
            dao.upsert(entity("u1", groupId = "g1", priority = 2))
            dao.upsert(entity("u2", groupId = "g1", priority = 0))
            dao.upsert(entity("u3", groupId = "g2", priority = 0))

            val urls = dao.getByGroupId("g1")

            assertEquals(listOf("u2", "u1"), urls.map { it.id })
        }

    @Test
    fun `deleteById remove apenas a url indicada`() =
        runTest {
            dao.upsert(entity("u1"))
            dao.upsert(entity("u2"))

            dao.deleteById("u1")

            assertNull(dao.getById("u1"))
            assertTrue(dao.getById("u2") != null)
        }

    @Test
    fun `deleteByGroupId remove todas as urls do grupo, preservando outros grupos`() =
        runTest {
            dao.upsert(entity("u1", groupId = "g1"))
            dao.upsert(entity("u2", groupId = "g1"))
            dao.upsert(entity("u3", groupId = "g2"))

            dao.deleteByGroupId("g1")

            assertTrue(dao.getByGroupId("g1").isEmpty())
            assertEquals(1, dao.getByGroupId("g2").size)
        }
}
