package com.mymangareader.notifications

import com.mymangareader.core.database.NotificationGroupDao
import com.mymangareader.core.database.NotificationGroupEntity
import com.mymangareader.core.database.NotificationUrlDao
import com.mymangareader.core.database.NotificationUrlEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

// Shared fakes for NotificationGroupDao/NotificationUrlDao — used by NotificationsTest and
// NotificationGroupResolverTest, one copy per Gradle source set.

class FakeNotificationGroupDao : NotificationGroupDao {
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

class FakeNotificationUrlDao : NotificationUrlDao {
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
