package com.mymangareader.core.database

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NotificationHistoryDaoTest {
    private lateinit var db: AppDatabase
    private lateinit var dao: NotificationHistoryDao

    @Before
    fun setUp() {
        db =
            Room
                .inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), AppDatabase::class.java)
                .allowMainThreadQueries()
                .build()
        dao = db.notificationHistoryDao()
    }

    @After
    fun tearDown() {
        db.close()
    }

    private fun entity(
        id: String,
        seriesId: String = "s1",
        seriesName: String = "One Piece",
        chapterIdsJson: String? = null,
        chapterNumbersJson: String? = null,
        detectedAtMs: Long = 1_000L,
        read: Boolean = false,
        createdAtLocalMs: Long = 1_000L,
    ) = NotificationHistoryEntity(
        id = id,
        seriesId = seriesId,
        seriesName = seriesName,
        chapterIdsJson = chapterIdsJson,
        chapterNumbersJson = chapterNumbersJson,
        detectedAtMs = detectedAtMs,
        read = read,
        createdAtLocalMs = createdAtLocalMs,
    )

    @Test
    fun `getById retorna null quando o item nao existe`() =
        runTest {
            assertNull(dao.getById("missing"))
        }

    @Test
    fun `insertOrReplace seguido de getById retorna o item gravado`() =
        runTest {
            dao.insertOrReplace(entity("s1", seriesName = "One Piece"))

            assertEquals("One Piece", dao.getById("s1")?.seriesName)
        }

    @Test
    fun `insertOrReplace com o mesmo id substitui o item anterior, nunca empilha`() =
        runTest {
            dao.insertOrReplace(entity("s1", detectedAtMs = 1_000L))
            dao.insertOrReplace(entity("s1", detectedAtMs = 2_000L))

            assertEquals(1, dao.listAll().size)
            assertEquals(2_000L, dao.getById("s1")?.detectedAtMs)
        }

    @Test
    fun `listAll ordena por detectedAtMs decrescente`() =
        runTest {
            dao.insertOrReplace(entity("s1", detectedAtMs = 1_000L))
            dao.insertOrReplace(entity("s2", detectedAtMs = 3_000L))
            dao.insertOrReplace(entity("s3", detectedAtMs = 2_000L))

            assertEquals(listOf("s2", "s3", "s1"), dao.listAll().map { it.id })
        }

    @Test
    fun `markRead marca apenas o item indicado como lido`() =
        runTest {
            dao.insertOrReplace(entity("s1"))
            dao.insertOrReplace(entity("s2"))

            dao.markRead("s1")

            assertTrue(dao.getById("s1")?.read == true)
            assertFalse(dao.getById("s2")?.read == true)
        }

    @Test
    fun `markAllRead marca todos os itens como lidos e e idempotente`() =
        runTest {
            dao.insertOrReplace(entity("s1"))
            dao.insertOrReplace(entity("s2"))

            dao.markAllRead()
            dao.markAllRead()

            assertTrue(dao.listAll().all { it.read })
        }

    @Test
    fun `delete remove apenas o item indicado`() =
        runTest {
            dao.insertOrReplace(entity("s1"))
            dao.insertOrReplace(entity("s2"))

            dao.delete("s1")

            assertNull(dao.getById("s1"))
            assertTrue(dao.getById("s2") != null)
        }

    @Test
    fun `deleteOlderThan remove apenas itens estritamente mais antigos que o corte`() =
        runTest {
            dao.insertOrReplace(entity("old", createdAtLocalMs = 1_000L))
            dao.insertOrReplace(entity("boundary", createdAtLocalMs = 2_000L))
            dao.insertOrReplace(entity("fresh", createdAtLocalMs = 3_000L))

            dao.deleteOlderThan(2_000L)

            assertNull(dao.getById("old"))
            assertTrue(dao.getById("boundary") != null)
            assertTrue(dao.getById("fresh") != null)
        }

    @Test
    fun `countUnread conta apenas itens nao lidos`() =
        runTest {
            dao.insertOrReplace(entity("s1", read = false))
            dao.insertOrReplace(entity("s2", read = false))
            dao.insertOrReplace(entity("s3", read = true))

            assertEquals(2, dao.countUnread())
        }
}
