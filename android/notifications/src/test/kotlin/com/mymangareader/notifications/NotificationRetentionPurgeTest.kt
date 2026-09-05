package com.mymangareader.notifications

import com.mymangareader.core.database.NotificationHistoryEntity
import com.mymangareader.preferences.Preferences
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

private const val ONE_DAY_MS = 24L * 60 * 60 * 1000

class NotificationRetentionPurgeTest {
    private lateinit var groupDao: FakeNotificationGroupDao
    private lateinit var urlDao: FakeNotificationUrlDao
    private lateinit var historyDao: FakeNotificationHistoryDao
    private lateinit var notifications: Notifications
    private lateinit var preferences: Preferences
    private lateinit var purge: NotificationRetentionPurge

    @Before
    fun setUp() {
        groupDao = FakeNotificationGroupDao()
        urlDao = FakeNotificationUrlDao()
        historyDao = FakeNotificationHistoryDao()
        notifications = Notifications(groupDao, urlDao, historyDao, FakeUrlSelector())
        preferences = Preferences(FakePreferenceDao())
        purge = NotificationRetentionPurge(notifications, preferences)
    }

    private suspend fun insertHistoryItem(
        id: String,
        createdAtLocalMs: Long,
    ) {
        historyDao.insertOrReplace(
            NotificationHistoryEntity(
                id = id,
                seriesId = "s1",
                seriesName = "Series",
                chapterIdsJson = null,
                chapterNumbersJson = null,
                detectedAtMs = createdAtLocalMs,
                read = false,
                createdAtLocalMs = createdAtLocalMs,
            ),
        )
    }

    @Test
    fun `purge nao faz nada quando retentionDays nao esta configurado`() =
        runTest {
            insertHistoryItem("h1", createdAtLocalMs = 0)

            purge.purge(now = 100 * ONE_DAY_MS)

            assertNotNull(historyDao.getById("h1"))
        }

    @Test
    fun `item exatamente no cutoff e mantido, um ms mais velho e purgado`() =
        runTest {
            val now = 100 * ONE_DAY_MS
            val retentionDays = 30
            val cutoff = now - retentionDays * ONE_DAY_MS

            insertHistoryItem("atCutoff", createdAtLocalMs = cutoff)
            insertHistoryItem("olderThanCutoff", createdAtLocalMs = cutoff - 1)

            preferences.put(NotificationPreferenceKeys.RETENTION_DAYS, retentionDays.toString(), domain = NotificationPreferenceKeys.DOMAIN)

            purge.purge(now = now)

            assertNotNull(historyDao.getById("atCutoff"))
            assertNull(historyDao.getById("olderThanCutoff"))
        }

    @Test
    fun `item mais novo que o cutoff nunca e purgado`() =
        runTest {
            val now = 100 * ONE_DAY_MS
            insertHistoryItem("recent", createdAtLocalMs = now)
            preferences.put(NotificationPreferenceKeys.RETENTION_DAYS, "30", domain = NotificationPreferenceKeys.DOMAIN)

            purge.purge(now = now)

            assertNotNull(historyDao.getById("recent"))
        }
}
