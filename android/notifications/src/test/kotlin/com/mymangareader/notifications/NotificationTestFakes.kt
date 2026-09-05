package com.mymangareader.notifications

import com.mymangareader.core.database.NotificationGroupDao
import com.mymangareader.core.database.NotificationGroupEntity
import com.mymangareader.core.database.NotificationHistoryDao
import com.mymangareader.core.database.NotificationHistoryEntity
import com.mymangareader.core.database.NotificationUrlDao
import com.mymangareader.core.database.NotificationUrlEntity
import com.mymangareader.core.database.PreferenceDao
import com.mymangareader.core.database.PreferenceEntity
import com.mymangareader.tools.network.UrlCandidate
import com.mymangareader.tools.network.UrlProbeResult
import com.mymangareader.tools.network.UrlSelector
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

// Shared fakes for NotificationGroupDao/NotificationUrlDao/NotificationHistoryDao/PreferenceDao —
// used across this module's tests, one copy per Gradle source set.

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

class FakeNotificationHistoryDao : NotificationHistoryDao {
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

class FakePreferenceDao : PreferenceDao {
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

// A minimal, never-really-called-in-most-tests UrlSelector — Notifications only reaches it via
// group(id).testUrl(), which most tests here don't exercise; this exists purely so Notifications'
// constructor is satisfiable everywhere.
class FakeUrlSelector : UrlSelector {
    var probeResult: (UrlCandidate) -> UrlProbeResult = { c -> UrlProbeResult(c.url.trimEnd('/'), ok = true, status = 200, elapsedMs = 1) }

    override suspend fun getActiveUrl(candidates: List<UrlCandidate>): Result<String> = candidates.firstOrNull()?.let { Result.success(it.url) } ?: Result.failure(Exception("no candidates"))

    override suspend fun invalidateAndReselect(candidates: List<UrlCandidate>): Result<String> = getActiveUrl(candidates)

    override fun getLastKnownUrl(): String? = null

    override suspend fun probe(candidate: UrlCandidate): UrlProbeResult = probeResult(candidate)
}
