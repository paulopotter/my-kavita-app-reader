package com.mymangareader.notifications

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class NotificationConnectionGateTest {
    private lateinit var groupDao: FakeNotificationGroupDao
    private lateinit var urlDao: FakeNotificationUrlDao
    private lateinit var historyDao: FakeNotificationHistoryDaoForGate
    private lateinit var notifications: Notifications
    private var channelEnabled = false
    private lateinit var gate: NotificationConnectionGate

    @Before
    fun setUp() {
        groupDao = FakeNotificationGroupDao()
        urlDao = FakeNotificationUrlDao()
        historyDao = FakeNotificationHistoryDaoForGate()
        notifications = Notifications(groupDao, urlDao, historyDao)
        channelEnabled = false
        gate = NotificationConnectionGate(notifications, NotificationChannelState { channelEnabled })
    }

    private suspend fun addGroupWithUrl() {
        val group = notifications.groups.add(NewNotificationGroup(name = "Home", providerId = "ntfy", topic = "chapters"))
        notifications.group(group.id).addUrl(NewNotificationUrl(url = "https://lan.local", timeoutMs = 5_000, priority = 0))
    }

    private suspend fun addGroupWithoutUrl() {
        notifications.groups.add(NewNotificationGroup(name = "Home", providerId = "ntfy", topic = "chapters"))
    }

    @Test
    fun `shouldConnect e false quando nao ha url e o canal esta desabilitado`() =
        runTest {
            assertFalse(gate.shouldConnect())
        }

    @Test
    fun `shouldConnect e false quando ha url mas o canal esta desabilitado`() =
        runTest {
            addGroupWithUrl()

            assertFalse(gate.shouldConnect())
        }

    @Test
    fun `shouldConnect e false quando o canal esta habilitado mas nao ha nenhuma url`() =
        runTest {
            addGroupWithoutUrl()
            channelEnabled = true

            assertFalse(gate.shouldConnect())
        }

    @Test
    fun `shouldConnect e true quando ha url e o canal esta habilitado`() =
        runTest {
            addGroupWithUrl()
            channelEnabled = true

            assertTrue(gate.shouldConnect())
        }
}

// Minimal in-memory NotificationHistoryDao — this test never touches history, but Notifications'
// constructor requires one.
private class FakeNotificationHistoryDaoForGate : com.mymangareader.core.database.NotificationHistoryDao {
    override suspend fun insertOrReplace(entity: com.mymangareader.core.database.NotificationHistoryEntity) = Unit

    override fun observeAll(): kotlinx.coroutines.flow.Flow<List<com.mymangareader.core.database.NotificationHistoryEntity>> = kotlinx.coroutines.flow.MutableStateFlow(emptyList())

    override suspend fun listAll(): List<com.mymangareader.core.database.NotificationHistoryEntity> = emptyList()

    override suspend fun getById(id: String): com.mymangareader.core.database.NotificationHistoryEntity? = null

    override suspend fun markRead(id: String) = Unit

    override suspend fun markAllRead() = Unit

    override suspend fun delete(id: String) = Unit

    override suspend fun deleteOlderThan(epochMs: Long) = Unit

    override suspend fun countUnread(): Int = 0
}
