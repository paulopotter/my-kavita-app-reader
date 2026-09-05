package com.mymangareader.notifications

import com.mymangareader.core.database.PreferenceDao
import com.mymangareader.core.database.PreferenceEntity
import com.mymangareader.preferences.Preferences
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

private class FakeGatePreferenceDao : PreferenceDao {
    private val rows = mutableMapOf<String, PreferenceEntity>()

    override suspend fun getByKey(
        key: String,
        variant: String,
    ): PreferenceEntity? = rows["$key:$variant"]

    override suspend fun upsert(entity: PreferenceEntity) {
        rows["${entity.key}:${entity.variant}"] = entity
    }

    override suspend fun deleteByKey(
        key: String,
        variant: String,
    ) {
        rows.remove("$key:$variant")
    }

    override suspend fun deleteByDomain(domain: String) {
        rows.values.filter { it.domain == domain }.forEach { rows.remove("${it.key}:${it.variant}") }
    }
}

class NotificationConnectionGateTest {
    private lateinit var groupDao: FakeNotificationGroupDao
    private lateinit var urlDao: FakeNotificationUrlDao
    private lateinit var historyDao: FakeNotificationHistoryDaoForGate
    private lateinit var preferences: Preferences
    private lateinit var notifications: Notifications
    private lateinit var gate: NotificationConnectionGate

    @Before
    fun setUp() {
        groupDao = FakeNotificationGroupDao()
        urlDao = FakeNotificationUrlDao()
        historyDao = FakeNotificationHistoryDaoForGate()
        notifications = Notifications(groupDao, urlDao, historyDao)
        preferences = Preferences(FakeGatePreferenceDao())
        gate = NotificationConnectionGate(notifications, preferences)
    }

    private suspend fun addGroupWithUrl() {
        val group = notifications.groups.add(NewNotificationGroup(name = "Home", providerId = "ntfy", topic = "chapters"))
        notifications.group(group.id).addUrl(NewNotificationUrl(url = "https://lan.local", timeoutMs = 5_000, priority = 0))
    }

    private suspend fun addGroupWithoutUrl() {
        notifications.groups.add(NewNotificationGroup(name = "Home", providerId = "ntfy", topic = "chapters"))
    }

    @Test
    fun `shouldConnect e false quando nao ha url e o toggle esta desligado`() =
        runTest {
            assertFalse(gate.shouldConnect())
        }

    @Test
    fun `shouldConnect e false quando ha url mas o toggle esta desligado`() =
        runTest {
            addGroupWithUrl()

            assertFalse(gate.shouldConnect())
        }

    @Test
    fun `shouldConnect e false quando o toggle esta ligado mas nao ha nenhuma url`() =
        runTest {
            addGroupWithoutUrl()
            preferences.put("enabled", "true", domain = "notifications")

            assertFalse(gate.shouldConnect())
        }

    @Test
    fun `shouldConnect e true quando ha url e o toggle esta ligado`() =
        runTest {
            addGroupWithUrl()
            preferences.put("enabled", "true", domain = "notifications")

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
