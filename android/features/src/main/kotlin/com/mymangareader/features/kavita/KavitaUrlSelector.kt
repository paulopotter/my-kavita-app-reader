package com.mymangareader.features.kavita

import com.mymangareader.core.database.ServerConfigDao
import com.mymangareader.tools.network.UrlCandidate
import com.mymangareader.tools.network.UrlSelector
import javax.inject.Inject
import javax.inject.Singleton

private const val KAVITA_HEALTH_PATH = "/api/health"

interface KavitaUrlSource {
    suspend fun getActiveUrl(): Result<String>
    suspend fun invalidateAndReselect(): Result<String>
    fun getLastKnownUrl(): String?
}

@Singleton
class KavitaUrlSelector @Inject constructor(
    private val serverConfigDao: ServerConfigDao,
    private val selector: UrlSelector,
) : KavitaUrlSource {
    override suspend fun getActiveUrl(): Result<String> {
        val candidates = serverConfigDao.getAll().map { entity ->
            UrlCandidate(
                id = entity.id,
                url = entity.url,
                timeoutMs = entity.timeoutMs,
                priority = entity.priority,
                healthCheckPath = entity.healthCheckPath.ifBlank { KAVITA_HEALTH_PATH },
            )
        }
        return selector.getActiveUrl(candidates)
    }

    override suspend fun invalidateAndReselect(): Result<String> {
        val candidates = serverConfigDao.getAll().map { entity ->
            UrlCandidate(
                id = entity.id,
                url = entity.url,
                timeoutMs = entity.timeoutMs,
                priority = entity.priority,
                healthCheckPath = entity.healthCheckPath.ifBlank { KAVITA_HEALTH_PATH },
            )
        }
        return selector.invalidateAndReselect(candidates)
    }

    override fun getLastKnownUrl(): String? = selector.getLastKnownUrl()
}
