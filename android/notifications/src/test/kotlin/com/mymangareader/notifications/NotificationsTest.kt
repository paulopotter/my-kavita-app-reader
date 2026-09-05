package com.mymangareader.notifications

import com.mymangareader.core.database.NotificationGroupDao
import com.mymangareader.core.database.NotificationGroupEntity
import com.mymangareader.core.database.NotificationHistoryDao
import com.mymangareader.core.database.NotificationHistoryEntity
import com.mymangareader.core.database.NotificationUrlDao
import com.mymangareader.core.database.NotificationUrlEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import kotlin.test.assertFailsWith

// ── Fakes ──────────────────────────────────────────────────────────────────

private class FakeNotificationGroupDao : NotificationGroupDao {
    private val rows = mutableMapOf<String, NotificationGroupEntity>()

    override suspend fun upsert(entity: NotificationGroupEntity) {
        rows[entity.id] = entity
    }

    override suspend fun delete(entity: NotificationGroupEntity) {
        rows.remove(entity.id)
    }

    override fun observeAll(): Flow<List<NotificationGroupEntity>> = MutableStateFlow(rows.values.toList())

    override suspend fun getAll(): List<NotificationGroupEntity> = rows.values.toList()

    override suspend fun getById(id: String): NotificationGroupEntity? = rows[id]

    override suspend fun deleteById(id: String) {
        rows.remove(id)
    }
}

private class FakeNotificationUrlDao : NotificationUrlDao {
    private val rows = mutableMapOf<String, NotificationUrlEntity>()

    override suspend fun upsert(entity: NotificationUrlEntity) {
        rows[entity.id] = entity
    }

    override suspend fun delete(entity: NotificationUrlEntity) {
        rows.remove(entity.id)
    }

    override fun observeByGroupId(groupId: String): Flow<List<NotificationUrlEntity>> = MutableStateFlow(rows.values.filter { it.groupId == groupId }.sortedBy { it.priority })

    override suspend fun getByGroupId(groupId: String): List<NotificationUrlEntity> = rows.values.filter { it.groupId == groupId }.sortedBy { it.priority }

    override suspend fun getById(id: String): NotificationUrlEntity? = rows[id]

    override suspend fun deleteById(id: String) {
        rows.remove(id)
    }

    override suspend fun deleteByGroupId(groupId: String) {
        rows.values.filter { it.groupId == groupId }.forEach { rows.remove(it.id) }
    }
}

private class FakeNotificationHistoryDao : NotificationHistoryDao {
    private val rows = mutableMapOf<String, NotificationHistoryEntity>()

    override suspend fun insertOrReplace(entity: NotificationHistoryEntity) {
        rows[entity.id] = entity
    }

    override fun observeAll(): Flow<List<NotificationHistoryEntity>> = MutableStateFlow(rows.values.sortedByDescending { it.detectedAtMs })

    override suspend fun listAll(): List<NotificationHistoryEntity> = rows.values.sortedByDescending { it.detectedAtMs }

    override suspend fun getById(id: String): NotificationHistoryEntity? = rows[id]

    override suspend fun markRead(id: String) {
        rows[id]?.let { rows[id] = it.copy(read = true) }
    }

    override suspend fun markAllRead() {
        rows.keys.toList().forEach { id -> rows[id] = rows.getValue(id).copy(read = true) }
    }

    override suspend fun delete(id: String) {
        rows.remove(id)
    }

    override suspend fun deleteOlderThan(epochMs: Long) {
        rows.values.filter { it.createdAtLocalMs < epochMs }.forEach { rows.remove(it.id) }
    }

    override suspend fun countUnread(): Int = rows.values.count { !it.read }
}

// ── Tests ──────────────────────────────────────────────────────────────────

class NotificationsTest {
    private lateinit var groupDao: FakeNotificationGroupDao
    private lateinit var urlDao: FakeNotificationUrlDao
    private lateinit var historyDao: FakeNotificationHistoryDao
    private lateinit var notifications: Notifications

    @Before
    fun setUp() {
        groupDao = FakeNotificationGroupDao()
        urlDao = FakeNotificationUrlDao()
        historyDao = FakeNotificationHistoryDao()
        notifications = Notifications(groupDao, urlDao, historyDao)
    }

    // ── groups ──

    @Test
    fun `groups add cria um grupo e groups get o retorna`() =
        runTest {
            val created = notifications.groups.add(NewNotificationGroup(name = "Home", providerId = "ntfy", topic = "chapters"))

            val fetched = notifications.groups.get(created.id)

            assertEquals("Home", fetched?.name)
            assertEquals("ntfy", fetched?.providerId)
            assertEquals("chapters", fetched?.topic)
        }

    @Test
    fun `groups add rejeita name em branco`() =
        runTest {
            assertFailsWith<NotificationsException> {
                notifications.groups.add(NewNotificationGroup(name = " ", providerId = "ntfy", topic = "chapters"))
            }
        }

    @Test
    fun `groups update altera apenas os campos informados`() =
        runTest {
            val created = notifications.groups.add(NewNotificationGroup(name = "Home", providerId = "ntfy", topic = "chapters"))

            val updated = notifications.groups.update(created.id, topic = "new-topic")

            assertEquals("Home", updated.name)
            assertEquals("new-topic", updated.topic)
        }

    @Test
    fun `groups update falha quando o grupo nao existe`() =
        runTest {
            assertFailsWith<NotificationsException> {
                notifications.groups.update("missing", name = "x")
            }
        }

    @Test
    fun `groups remove apaga o grupo e suas urls`() =
        runTest {
            val group = notifications.groups.add(NewNotificationGroup(name = "Home", providerId = "ntfy", topic = "chapters"))
            notifications.group(group.id).addUrl(NewNotificationUrl(url = "https://lan.local", timeoutMs = 5_000, priority = 0))

            notifications.groups.remove(group.id)

            assertNull(notifications.groups.get(group.id))
            assertTrue(notifications.group(group.id).getUrls().isEmpty())
        }

    // ── group(id) urls ──

    @Test
    fun `group addUrl cria uma url vinculada ao grupo`() =
        runTest {
            val group = notifications.groups.add(NewNotificationGroup(name = "Home", providerId = "ntfy", topic = "chapters"))

            val url = notifications.group(group.id).addUrl(NewNotificationUrl(url = "https://lan.local", timeoutMs = 5_000, priority = 0))

            assertEquals(group.id, url.groupId)
            assertEquals(listOf(url.id), notifications.group(group.id).getUrls().map { it.id })
        }

    @Test
    fun `group addUrl falha quando o grupo nao existe`() =
        runTest {
            assertFailsWith<NotificationsException> {
                notifications.group("missing").addUrl(NewNotificationUrl(url = "https://lan.local", timeoutMs = 5_000, priority = 0))
            }
        }

    @Test
    fun `group getInfo embute a lista de urls do grupo`() =
        runTest {
            val group = notifications.groups.add(NewNotificationGroup(name = "Home", providerId = "ntfy", topic = "chapters"))
            notifications.group(group.id).addUrl(NewNotificationUrl(url = "https://lan.local", timeoutMs = 5_000, priority = 0))
            notifications.group(group.id).addUrl(NewNotificationUrl(url = "https://wan.example", timeoutMs = 8_000, priority = 1))

            val info = notifications.group(group.id).getInfo()

            assertEquals(2, info.urls.size)
        }

    @Test
    fun `group updateUrl altera apenas os campos informados`() =
        runTest {
            val group = notifications.groups.add(NewNotificationGroup(name = "Home", providerId = "ntfy", topic = "chapters"))
            val url = notifications.group(group.id).addUrl(NewNotificationUrl(url = "https://lan.local", timeoutMs = 5_000, priority = 0))

            val updated = notifications.group(group.id).updateUrl(url.id, priority = 2)

            assertEquals("https://lan.local", updated.url)
            assertEquals(2, updated.priority)
        }

    @Test
    fun `group removeUrl apaga apenas a url indicada`() =
        runTest {
            val group = notifications.groups.add(NewNotificationGroup(name = "Home", providerId = "ntfy", topic = "chapters"))
            val url1 = notifications.group(group.id).addUrl(NewNotificationUrl(url = "https://lan.local", timeoutMs = 5_000, priority = 0))
            val url2 = notifications.group(group.id).addUrl(NewNotificationUrl(url = "https://wan.example", timeoutMs = 8_000, priority = 1))

            notifications.group(group.id).removeUrl(url1.id)

            assertEquals(listOf(url2.id), notifications.group(group.id).getUrls().map { it.id })
        }

    // ── history ──

    @Test
    fun `history insertOrReplace com o mesmo id substitui o item anterior`() =
        runTest {
            notifications.history.insertOrReplace(
                NewNotificationHistoryItem(
                    id = "s1",
                    seriesId = "1",
                    seriesName = "One Piece",
                    chapterIds = listOf("101"),
                    chapterNumbers = listOf("1120"),
                    detectedAtMs = 1_000L,
                ),
            )
            notifications.history.insertOrReplace(
                NewNotificationHistoryItem(
                    id = "s1",
                    seriesId = "1",
                    seriesName = "One Piece",
                    chapterIds = listOf("102"),
                    chapterNumbers = listOf("1121"),
                    detectedAtMs = 2_000L,
                ),
            )

            val all = notifications.history.listAll()

            assertEquals(1, all.size)
            assertEquals(listOf("102"), all.first().chapterIds)
        }

    @Test
    fun `history insertOrReplace preserva null quando chapterIds e chapterNumbers estao ausentes`() =
        runTest {
            notifications.history.insertOrReplace(
                NewNotificationHistoryItem(
                    id = "s1",
                    seriesId = "1",
                    seriesName = "One Piece",
                    chapterIds = null,
                    chapterNumbers = null,
                    detectedAtMs = 1_000L,
                ),
            )

            val item = notifications.history.listAll().first()

            assertNull(item.chapterIds)
            assertNull(item.chapterNumbers)
        }

    @Test
    fun `history markRead e markAllRead atualizam o campo read`() =
        runTest {
            notifications.history.insertOrReplace(
                NewNotificationHistoryItem(id = "s1", seriesId = "1", seriesName = "A", chapterIds = null, chapterNumbers = null, detectedAtMs = 1_000L),
            )
            notifications.history.insertOrReplace(
                NewNotificationHistoryItem(id = "s2", seriesId = "2", seriesName = "B", chapterIds = null, chapterNumbers = null, detectedAtMs = 2_000L),
            )

            notifications.history.markRead("s1")

            assertEquals(1, notifications.history.countUnread())

            notifications.history.markAllRead()

            assertEquals(0, notifications.history.countUnread())
        }

    @Test
    fun `history delete remove apenas o item indicado`() =
        runTest {
            notifications.history.insertOrReplace(
                NewNotificationHistoryItem(id = "s1", seriesId = "1", seriesName = "A", chapterIds = null, chapterNumbers = null, detectedAtMs = 1_000L),
            )
            notifications.history.insertOrReplace(
                NewNotificationHistoryItem(id = "s2", seriesId = "2", seriesName = "B", chapterIds = null, chapterNumbers = null, detectedAtMs = 2_000L),
            )

            notifications.history.delete("s1")

            assertEquals(listOf("s2"), notifications.history.listAll().map { it.id })
        }

    @Test
    fun `history deleteOlderThan remove apenas itens estritamente mais antigos`() =
        runTest {
            historyDao.insertOrReplace(
                NotificationHistoryEntity(
                    id = "old",
                    seriesId = "1",
                    seriesName = "A",
                    chapterIdsJson = null,
                    chapterNumbersJson = null,
                    detectedAtMs = 1_000L,
                    read = false,
                    createdAtLocalMs = 1_000L,
                ),
            )
            historyDao.insertOrReplace(
                NotificationHistoryEntity(
                    id = "fresh",
                    seriesId = "2",
                    seriesName = "B",
                    chapterIdsJson = null,
                    chapterNumbersJson = null,
                    detectedAtMs = 2_000L,
                    read = false,
                    createdAtLocalMs = 3_000L,
                ),
            )

            notifications.history.deleteOlderThan(2_000L)

            assertEquals(listOf("fresh"), notifications.history.listAll().map { it.id })
        }
}
