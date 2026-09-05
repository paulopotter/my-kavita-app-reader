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
class NotificationGroupDaoTest {
    private lateinit var db: AppDatabase
    private lateinit var dao: NotificationGroupDao

    @Before
    fun setUp() {
        db =
            Room
                .inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), AppDatabase::class.java)
                .allowMainThreadQueries()
                .build()
        dao = db.notificationGroupDao()
    }

    @After
    fun tearDown() {
        db.close()
    }

    private fun entity(
        id: String,
        name: String = "My ntfy",
        providerId: String = "ntfy",
        topic: String = "my-topic",
    ) = NotificationGroupEntity(id = id, name = name, providerId = providerId, topic = topic)

    @Test
    fun `getById retorna null quando o grupo nao existe`() =
        runTest {
            assertNull(dao.getById("missing"))
        }

    @Test
    fun `upsert seguido de getById retorna o grupo gravado`() =
        runTest {
            dao.upsert(entity("g1", name = "Home ntfy"))

            assertEquals("Home ntfy", dao.getById("g1")?.name)
        }

    @Test
    fun `upsert com o mesmo id substitui o grupo anterior`() =
        runTest {
            dao.upsert(entity("g1", topic = "old-topic"))
            dao.upsert(entity("g1", topic = "new-topic"))

            assertEquals("new-topic", dao.getById("g1")?.topic)
        }

    @Test
    fun `getAll retorna todos os grupos gravados`() =
        runTest {
            dao.upsert(entity("g1"))
            dao.upsert(entity("g2"))

            assertEquals(setOf("g1", "g2"), dao.getAll().map { it.id }.toSet())
        }

    @Test
    fun `deleteById remove apenas o grupo indicado`() =
        runTest {
            dao.upsert(entity("g1"))
            dao.upsert(entity("g2"))

            dao.deleteById("g1")

            assertNull(dao.getById("g1"))
            assertTrue(dao.getById("g2") != null)
        }

    @Test
    fun `delete remove o grupo pela entidade`() =
        runTest {
            val group = entity("g1")
            dao.upsert(group)

            dao.delete(group)

            assertNull(dao.getById("g1"))
        }
}
