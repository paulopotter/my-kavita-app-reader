package com.mymangareader.server.plugins.kavita.auth

import com.mymangareader.tools.network.RequestTool
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

private const val AUTHENTICATE_PATH = "/api/Plugin/authenticate"
private const val PLUGIN_NAME = "mymangareader"
private const val AUTHKEY_EXPIRES_PATH = "/api/Plugin/authkey-expires"
private const val REFRESH_TOKEN_PATH = "/api/Account/refresh-token"

private val authJson = Json { ignoreUnknownKeys = true }

@Serializable
data class KavitaUserDto(
    val username: String,
    val token: String,
    val refreshToken: String? = null,
)

@Serializable
data class KavitaAuthKeyExpiryDto(
    val expiresAt: String? = null,
)

@Serializable
data class KavitaTokenRequestDto(
    val token: String? = null,
    val refreshToken: String? = null,
)

class KavitaAuth(
    private val baseUrl: String,
    private val requestTool: RequestTool,
) {
    suspend fun authenticate(apiKey: String): Result<KavitaUserDto> {
        val url = "$baseUrl$AUTHENTICATE_PATH?apiKey=$apiKey&pluginName=$PLUGIN_NAME"

        return requestTool.request(url = url, method = "POST").mapCatching { http ->
            when {
                http.status == 200 -> authJson.decodeFromString<KavitaUserDto>(http.body)
                http.status == 401 -> error("Invalid API key (401)")
                else -> error("Authentication failed: HTTP ${http.status}")
            }
        }
    }

    // The apiKey itself (not the JWT) can expire — Kavita exposes this separately since the JWT
    // carries no expiry info of its own; a JWT is only known to be stale once a request 401s.
    suspend fun checkApiKeyExpiry(jwt: String): Result<KavitaAuthKeyExpiryDto> =
        requestTool.request(
            url = "$baseUrl$AUTHKEY_EXPIRES_PATH",
            method = "GET",
            headers = mapOf("Authorization" to "Bearer $jwt"),
        ).mapCatching { http ->
            if (http.status != 200) error("AuthKey expiry check failed: HTTP ${http.status}")
            authJson.decodeFromString<KavitaAuthKeyExpiryDto>(http.body)
        }

    suspend fun reauthenticate(token: String, refreshToken: String): Result<KavitaTokenRequestDto> =
        requestTool.request(
            url = "$baseUrl$REFRESH_TOKEN_PATH",
            method = "POST",
            headers = mapOf("Content-Type" to "application/json"),
            body = authJson.encodeToString(KavitaTokenRequestDto.serializer(), KavitaTokenRequestDto(token, refreshToken)),
        ).mapCatching { http ->
            if (http.status != 200) error("Token refresh failed: HTTP ${http.status}")
            authJson.decodeFromString<KavitaTokenRequestDto>(http.body)
        }

    // No-op by design: this class holds no JWT/session state of its own (receives it fresh on
    // every call, never persists it) — there's nothing here to clear, and Kavita has no
    // server-side logout/revoke endpoint. Whoever holds the actual session (outside this layer,
    // not built yet) is responsible for forgetting the JWT it cached.
    fun logout() = Unit
}
