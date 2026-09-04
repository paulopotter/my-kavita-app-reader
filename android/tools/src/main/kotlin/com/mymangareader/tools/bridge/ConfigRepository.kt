package com.mymangareader.tools.bridge

import android.app.LocaleManager
import android.os.Build
import android.os.LocaleList
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.mymangareader.core.database.AuthConfigEntity
import com.mymangareader.core.database.BffServerConfigEntity
import com.mymangareader.core.database.ServerConfigEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.Locale
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ConfigRepository @Inject constructor(
    private val store: ConfigStore,
    private val appContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(appContext) {

    override fun getName(): String = "ConfigRepository"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // Applies the app-wide per-app language via the platform's LocaleManager (API 33+), the same
    // mechanism that makes the app show up under Settings > System > Languages > App languages.
    // Below API 33 there's no system-level per-app language, so this falls back to updating the
    // JVM default Locale directly — enough for any Kotlin-side string formatting, though RN's own
    // UI language is already driven independently by the JS-side i18n context.
    private fun applyAppLocale(languageTag: String) {
        UiThreadUtil.runOnUiThread {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val localeManager = appContext.getSystemService(LocaleManager::class.java)
                localeManager?.applicationLocales = LocaleList.forLanguageTags(languageTag)
            } else {
                Locale.setDefault(Locale.forLanguageTag(languageTag))
            }
        }
    }

    // The OS's per-app language is the single source of truth for the UI language — there is no
    // separate "language" preference in the app's own storage. This returns the effective
    // language tag: the per-app override the user set (in the app or under Settings > App
    // languages), or, when none is set, the device's own locale. Always one of the app's
    // supported tags ("pt-BR" / "en"), so JS can use it directly.
    @ReactMethod
    fun getAppLocale(promise: Promise) {
        runCatching {
            val override = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                appContext.getSystemService(LocaleManager::class.java)?.applicationLocales
            } else {
                null
            }
            val tag = when {
                override != null && !override.isEmpty -> override[0].toLanguageTag()
                else -> Locale.getDefault().toLanguageTag()
            }
            promise.resolve(if (tag.startsWith("pt", ignoreCase = true)) "pt-BR" else "en")
        }.onFailure { promise.resolve("en") }
    }

    // Sets the OS per-app language. This is the ONLY thing an in-app language switch does — no
    // value is written to the app's storage; getAppLocale() reads it straight back from the OS.
    @ReactMethod
    fun setAppLocale(languageTag: String, promise: Promise) {
        applyAppLocale(languageTag)
        promise.resolve(null)
    }

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
