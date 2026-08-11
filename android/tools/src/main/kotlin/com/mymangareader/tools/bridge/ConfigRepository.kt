package com.mymangareader.tools.bridge

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.mymangareader.core.database.AuthConfigEntity
import com.mymangareader.core.database.BffServerConfigEntity
import com.mymangareader.core.database.ServerConfigEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ConfigRepository @Inject constructor(
    private val store: ConfigStore,
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "ConfigRepository"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // ── Server config ──────────────────────────────────────────────────────────

    @ReactMethod
    fun getServerConfigs(promise: Promise) {
        scope.launch {
            runCatching {
                val array = Arguments.createArray()
                store.getServerConfigs().forEach { s ->
                    Arguments.createMap().apply {
                        putString("id", s.id)
                        putString("url", s.url)
                        putInt("timeoutMs", s.timeoutMs)
                        putInt("priority", s.priority)
                        putString("healthCheckPath", s.healthCheckPath)
                    }.also { array.pushMap(it) }
                }
                promise.resolve(array)
            }.onFailure { promise.reject("DB_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun upsertServerConfig(data: ReadableMap, promise: Promise) {
        scope.launch {
            runCatching {
                store.upsertServerConfig(
                    ServerConfigEntity(
                        id = data.getString("id") ?: error("id required"),
                        url = data.getString("url") ?: error("url required"),
                        timeoutMs = if (data.hasKey("timeoutMs")) data.getInt("timeoutMs") else 5000,
                        priority = if (data.hasKey("priority")) data.getInt("priority") else 0,
                        healthCheckPath = data.getString("healthCheckPath") ?: "/api/Health",
                    ),
                )
                promise.resolve(null)
            }.onFailure { promise.reject("DB_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun deleteServerConfig(id: String, promise: Promise) {
        scope.launch {
            runCatching {
                store.deleteServerConfig(id)
                promise.resolve(null)
            }.onFailure { promise.reject("DB_ERROR", it.message, it) }
        }
    }

    // ── Auth config ────────────────────────────────────────────────────────────

    @ReactMethod
    fun getAuthConfig(promise: Promise) {
        scope.launch {
            runCatching {
                val auth = store.getAuthConfig()
                if (auth == null) {
                    promise.resolve(null)
                } else {
                    Arguments.createMap().apply {
                        putString("apiKey", auth.apiKey)
                        auth.jwt?.let { putString("jwt", it) }
                    }.also { promise.resolve(it) }
                }
            }.onFailure { promise.reject("DB_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun upsertAuthConfig(data: ReadableMap, promise: Promise) {
        scope.launch {
            runCatching {
                store.upsertAuthConfig(
                    AuthConfigEntity(
                        apiKey = data.getString("apiKey") ?: error("apiKey required"),
                        jwt = if (data.hasKey("jwt")) data.getString("jwt") else null,
                    ),
                )
                promise.resolve(null)
            }.onFailure { promise.reject("DB_ERROR", it.message, it) }
        }
    }

    // ── UI preferences ─────────────────────────────────────────────────────────

    @ReactMethod
    fun getUiPreferences(promise: Promise) {
        scope.launch {
            runCatching {
                val prefs = store.getUiPreferences()
                Arguments.createMap().apply {
                    putBoolean("keepScreenOnDuringReading", prefs.keepScreenOnDuringReading)
                    putString("chapterSortMode", prefs.chapterSortMode)
                    prefs.chapterSortFixedThreshold?.let { putDouble("chapterSortFixedThreshold", it) }
                    putInt("chapterSortProgressPercent", prefs.chapterSortProgressPercent)
                    putString("language", prefs.language)
                    putString("libraryViewMode", prefs.libraryViewMode)
                    putString("librarySortMode", prefs.librarySortMode)
                }.also { promise.resolve(it) }
            }.onFailure { promise.reject("DB_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun upsertUiPreferences(data: ReadableMap, promise: Promise) {
        scope.launch {
            runCatching {
                store.upsertUiPreferences {
                    copy(
                        keepScreenOnDuringReading = if (data.hasKey("keepScreenOnDuringReading"))
                            data.getBoolean("keepScreenOnDuringReading") else keepScreenOnDuringReading,
                        chapterSortMode = data.getString("chapterSortMode") ?: chapterSortMode,
                        chapterSortFixedThreshold = if (data.hasKey("chapterSortFixedThreshold"))
                            data.getDouble("chapterSortFixedThreshold") else chapterSortFixedThreshold,
                        chapterSortProgressPercent = if (data.hasKey("chapterSortProgressPercent"))
                            data.getInt("chapterSortProgressPercent") else chapterSortProgressPercent,
                        language = data.getString("language") ?: language,
                        libraryViewMode = data.getString("libraryViewMode") ?: libraryViewMode,
                        librarySortMode = data.getString("librarySortMode") ?: librarySortMode,
                    )
                }
                promise.resolve(null)
            }.onFailure { promise.reject("DB_ERROR", it.message, it) }
        }
    }

    // ── BFF server config ──────────────────────────────────────────────────────

    @ReactMethod
    fun getBffServerConfigs(promise: Promise) {
        scope.launch {
            runCatching {
                val array = Arguments.createArray()
                store.getBffServerConfigs().forEach { s ->
                    Arguments.createMap().apply {
                        putString("id", s.id)
                        putString("url", s.url)
                        putInt("priority", s.priority)
                        putString("healthCheckPath", s.healthCheckPath)
                        s.linkedKavitaServerConfigId?.let { putString("linkedKavitaServerConfigId", it) }
                    }.also { array.pushMap(it) }
                }
                promise.resolve(array)
            }.onFailure { promise.reject("DB_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun insertBffServerConfig(data: ReadableMap, promise: Promise) {
        scope.launch {
            runCatching {
                store.insertBffServerConfig(
                    BffServerConfigEntity(
                        id = UUID.randomUUID().toString(),
                        url = data.getString("url") ?: error("url required"),
                        priority = if (data.hasKey("priority")) data.getInt("priority") else 0,
                        healthCheckPath = data.getString("healthCheckPath")?.takeIf { it.isNotBlank() } ?: "/manga",
                        linkedKavitaServerConfigId = if (data.hasKey("linkedKavitaServerConfigId"))
                            data.getString("linkedKavitaServerConfigId") else null,
                    ),
                )
                promise.resolve(null)
            }.onFailure { promise.reject("DB_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun deleteBffServerConfig(id: String, promise: Promise) {
        scope.launch {
            runCatching {
                store.deleteBffServerConfig(id)
                promise.resolve(null)
            }.onFailure { promise.reject("DB_ERROR", it.message, it) }
        }
    }
}
