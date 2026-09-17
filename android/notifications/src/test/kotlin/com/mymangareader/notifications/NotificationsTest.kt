package com.mymangareader.notifications

import com.mymangareader.core.database.NotificationHistoryEntity
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import kotlin.test.assertFailsWith

// ── Fakes specific to this test (FakeNotificationGroupDao/FakeNotificationUrlDao/
// FakeNotificationHistoryDao live in NotificationTestFakes.kt, shared across this module's tests)
// ──

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
        notifications = Notifications(groupDao, urlDao, historyDao, FakeUrlSelector())
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
    fun `groups add com linkedServerGroupId persiste o vinculo`() =
        runTest {
            val created =
                notifications.groups.add(
                    NewNotificationGroup(name = "Home", providerId = "ntfy", topic = "chapters", linkedServerGroupId = "server-1"),
                )

            assertEquals("server-1", notifications.groups.get(created.id)?.linkedServerGroupId)
        }

    @Test
    fun `groups add sem linkedServerGroupId fica nulo`() =
        runTest {
            val created = notifications.groups.add(NewNotificationGroup(name = "Home", providerId = "ntfy", topic = "chapters"))

            assertNull(notifications.groups.get(created.id)?.linkedServerGroupId)
        }

    @Test
    fun `groups update com linkedServerGroupId atualiza o vinculo`() =
        runTest {
            val created = notifications.groups.add(NewNotificationGroup(name = "Home", providerId = "ntfy", topic = "chapters"))

            val updated = notifications.groups.update(created.id, linkedServerGroupId = "server-2")

            assertEquals("server-2", updated.linkedServerGroupId)
        }

    @Test
    fun `groups update sem tocar linkedServerGroupId preserva o valor existente`() =
        runTest {
            val created =
                notifications.groups.add(
                    NewNotificationGroup(name = "Home", providerId = "ntfy", topic = "chapters", linkedServerGroupId = "server-1"),
                )

            val updated = notifications.groups.update(created.id, name = "New name")

            assertEquals("server-1", updated.linkedServerGroupId)
        }

    @Test
    fun `groups update com clearLinkedServerGroupId remove o vinculo`() =
        runTest {
            val created =
                notifications.groups.add(
                    NewNotificationGroup(name = "Home", providerId = "ntfy", topic = "chapters", linkedServerGroupId = "server-1"),
                )

            val updated = notifications.groups.update(created.id, clearLinkedServerGroupId = true)

            assertNull(updated.linkedServerGroupId)
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
    fun `history insert nunca substitui, duas chamadas para o mesmo serial viram duas linhas`() =
        runTest {
            notifications.history.insert(
                NewNotificationHistoryItem(
                    seriesId = "1",
                    seriesName = "One Piece",
                    chapterId = "101",
                    chapterNumber = "1120",
                    detectedAtMs = 1_000L,
                ),
            )
            notifications.history.insert(
                NewNotificationHistoryItem(
                    seriesId = "1",
                    seriesName = "One Piece",
                    chapterId = "102",
                    chapterNumber = "1121",
                    detectedAtMs = 2_000L,
                ),
            )

            val all = notifications.history.listAll()

            assertEquals(2, all.size)
            assertEquals(setOf("101", "102"), all.map { it.chapterId }.toSet())
        }

    @Test
    fun `history insert preserva null quando chapterId e chapterNumber estao ausentes`() =
        runTest {
            notifications.history.insert(
                NewNotificationHistoryItem(
                    seriesId = "1",
                    seriesName = "One Piece",
                    chapterId = null,
                    chapterNumber = null,
                    detectedAtMs = 1_000L,
                ),
            )

            val item = notifications.history.listAll().first()

            assertNull(item.chapterId)
            assertNull(item.chapterNumber)
        }

    @Test
    fun `history insert retorna um id novo a cada chamada`() =
        runTest {
            val id1 = notifications.history.insert(
                NewNotificationHistoryItem(seriesId = "1", seriesName = "A", chapterId = null, chapterNumber = null, detectedAtMs = 1_000L),
            )
            val id2 = notifications.history.insert(
                NewNotificationHistoryItem(seriesId = "1", seriesName = "A", chapterId = null, chapterNumber = null, detectedAtMs = 2_000L),
            )

            assertTrue(id1 != id2)
        }

    @Test
    fun `history markRead e markAllRead atualizam o campo read`() =
        runTest {
            val id1 = notifications.history.insert(
                NewNotificationHistoryItem(seriesId = "1", seriesName = "A", chapterId = null, chapterNumber = null, detectedAtMs = 1_000L),
            )
            notifications.history.insert(
                NewNotificationHistoryItem(seriesId = "2", seriesName = "B", chapterId = null, chapterNumber = null, detectedAtMs = 2_000L),
            )

            notifications.history.markRead(id1)

            assertEquals(1, notifications.history.countUnread())

            notifications.history.markAllRead()

            assertEquals(0, notifications.history.countUnread())
        }

    @Test
    fun `history markUnread reverte markRead`() =
        runTest {
            val id1 = notifications.history.insert(
                NewNotificationHistoryItem(seriesId = "1", seriesName = "A", chapterId = null, chapterNumber = null, detectedAtMs = 1_000L),
            )
            notifications.history.markRead(id1)
            assertEquals(0, notifications.history.countUnread())

            notifications.history.markUnread(id1)

            assertEquals(1, notifications.history.countUnread())
        }

    @Test
    fun `history markReadByChapter marca so o capitulo consumido, deixando o resto do lote pendente`() =
        runTest {
            notifications.history.insert(
                NewNotificationHistoryItem(seriesId = "1", seriesName = "A", chapterId = "c1", chapterNumber = "10", detectedAtMs = 1_000L),
            )
            notifications.history.insert(
                NewNotificationHistoryItem(seriesId = "1", seriesName = "A", chapterId = "c2", chapterNumber = "11", detectedAtMs = 1_000L),
            )

            notifications.history.markReadByChapter(seriesId = "1", chapterId = "c1")

            assertEquals(1, notifications.history.countUnread())
        }

    @Test
    fun `history markSerialRead marca so as linhas sem capitulo do serial`() =
        runTest {
            notifications.history.insert(
                NewNotificationHistoryItem(seriesId = "1", seriesName = "A", chapterId = null, chapterNumber = null, detectedAtMs = 1_000L),
            )
            notifications.history.insert(
                NewNotificationHistoryItem(seriesId = "1", seriesName = "A", chapterId = "c1", chapterNumber = "10", detectedAtMs = 1_000L),
            )

            notifications.history.markSerialRead(seriesId = "1")

            // A linha do capitulo continua pendente: abrir o serial nao diz que ele foi lido.
            assertEquals(1, notifications.history.countUnread())
        }

    @Test
    fun `history delete remove apenas o item indicado`() =
        runTest {
            val id1 = notifications.history.insert(
                NewNotificationHistoryItem(seriesId = "1", seriesName = "A", chapterId = null, chapterNumber = null, detectedAtMs = 1_000L),
            )
            val id2 = notifications.history.insert(
                NewNotificationHistoryItem(seriesId = "2", seriesName = "B", chapterId = null, chapterNumber = null, detectedAtMs = 2_000L),
            )

            notifications.history.delete(id1)

            assertEquals(listOf(id2), notifications.history.listAll().map { it.id })
        }

    @Test
    fun `history deleteOlderThan remove apenas itens estritamente mais antigos`() =
        runTest {
            historyDao.insert(
                NotificationHistoryEntity(
                    id = "old",
                    seriesId = "1",
                    seriesName = "A",
                    chapterId = null,
                    chapterNumber = null,
                    detectedAtMs = 1_000L,
                    read = false,
                    createdAtLocalMs = 1_000L,
                ),
            )
            historyDao.insert(
                NotificationHistoryEntity(
                    id = "fresh",
                    seriesId = "2",
                    seriesName = "B",
                    chapterId = null,
                    chapterNumber = null,
                    detectedAtMs = 2_000L,
                    read = false,
                    createdAtLocalMs = 3_000L,
                ),
            )

            notifications.history.deleteOlderThan(2_000L)

            assertEquals(listOf("fresh"), notifications.history.listAll().map { it.id })
        }
}
