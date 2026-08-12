package com.mymangareader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.mymangareader.features.bff.BffFeature
import com.mymangareader.features.kavita.KavitaAuthFeature
import com.mymangareader.features.kavita.KavitaUrlSource
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SetupModule @Inject constructor(
    private val kavitaUrlSource: KavitaUrlSource,
    private val kavitaAuthFeature: KavitaAuthFeature,
    private val bffFeature: BffFeature,
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "SetupModule"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    @ReactMethod
    fun testKavitaConnection(promise: Promise) {
        scope.launch {
            kavitaUrlSource.invalidateAndReselect()
                .onSuccess { url ->
                    Arguments.createMap().apply {
                        putString("activeUrl", url)
                    }.let { promise.resolve(it) }
                }
                .onFailure { promise.reject("CONNECTION_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun forceReselectUrl(promise: Promise) {
        scope.launch {
            kavitaUrlSource.invalidateAndReselect()
                .onSuccess { url ->
                    Arguments.createMap().apply {
                        putString("activeUrl", url)
                    }.let { promise.resolve(it) }
                }
                .onFailure { promise.reject("CONNECTION_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun authenticate(apiKey: String, promise: Promise) {
        scope.launch {
            kavitaAuthFeature.authenticate(apiKey)
                .onSuccess { promise.resolve(null) }
                .onFailure { promise.reject("AUTH_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun isAuthenticated(promise: Promise) {
        scope.launch {
            runCatching { kavitaAuthFeature.isAuthenticated() }
                .onSuccess { promise.resolve(it) }
                .onFailure { promise.reject("AUTH_STATUS_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun getLastKnownUrls(promise: Promise) {
        Arguments.createMap().apply {
            kavitaUrlSource.getLastKnownUrl()?.let { putString("kavitaUrl", it) }
            bffFeature.getLastKnownUrl()?.let { putString("bffUrl", it) }
        }.let { promise.resolve(it) }
    }

    @ReactMethod
    fun testBffConnection(promise: Promise) {
        scope.launch {
            bffFeature.testConnection()
                .onSuccess { url ->
                    Arguments.createMap().apply {
                        putString("activeUrl", url)
                    }.let { promise.resolve(it) }
                }
                .onFailure { promise.reject("BFF_ERROR", it.message, it) }
        }
    }
}
