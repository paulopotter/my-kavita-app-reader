package com.mymangareader.features.kavita

import com.mymangareader.core.database.AuthConfigDao
import com.mymangareader.core.database.AuthConfigEntity
import com.mymangareader.tools.network.HttpResult
import com.mymangareader.tools.network.RequestTool
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

private const val KAVITA_AUTH_PATH = "/api/Plugin/authenticate"
private const val KAVITA_PLUGIN_NAME = "mymangareader"

data class KavitaAuthResult(val jwt: String)

@Singleton
class KavitaAuthFeature @Inject constructor(
    private val urlSelector: KavitaUrlSource,
    private val requestTool: RequestTool,
    private val authConfigDao: AuthConfigDao,
) {
    fun observeAuthConfig(): Flow<AuthConfigEntity?> = authConfigDao.observe()

    suspend fun authenticate(apiKey: String): Result<KavitaAuthResult> {
        val baseUrl = urlSelector.getActiveUrl().getOrElse { return Result.failure(it) }
        val url = "$baseUrl$KAVITA_AUTH_PATH?apiKey=$apiKey&pluginName=$KAVITA_PLUGIN_NAME"

        return requestTool.request(url = url, method = "POST").mapCatching { http ->
            when {
                http.status == 200 -> {
                    val json = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }
                    val user = json.decodeFromString<UserDto>(http.body)
                    authConfigDao.upsert(AuthConfigEntity(apiKey = apiKey, jwt = user.token))
                    KavitaAuthResult(user.token)
                }
                http.status == 401 -> error("Invalid API key (401)")
                else -> error("Authentication failed: HTTP ${http.status}")
            }
        }
    }

    suspend fun clearAuth() {
        val current = authConfigDao.get() ?: return
        authConfigDao.upsert(current.copy(jwt = null))
    }

    suspend fun isAuthenticated(): Boolean = authConfigDao.get()?.jwt != null

    suspend fun getStoredApiKey(): String? = authConfigDao.get()?.apiKey
}
