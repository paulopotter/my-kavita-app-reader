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
            kavitaUrlSource.invalidateAndReselect().resolveOrReject(promise, "CONNECTION_ERROR") { url ->
                Arguments.createMap().apply { putString("activeUrl", url) }
            }
        }
    }

    @ReactMethod
    fun forceReselectUrl(promise: Promise) {
        scope.launch {
            kavitaUrlSource.invalidateAndReselect().resolveOrReject(promise, "CONNECTION_ERROR") { url ->
                Arguments.createMap().apply { putString("activeUrl", url) }
            }
        }
    }

    @ReactMethod
    fun authenticate(apiKey: String, promise: Promise) {
        scope.launch {
            kavitaAuthFeature.authenticate(apiKey).resolveOrReject(promise, "AUTH_ERROR")
        }
    }

    @ReactMethod
    fun isAuthenticated(promise: Promise) {
        scope.launch {
            runCatching { kavitaAuthFeature.isAuthenticated() }.resolveOrReject(promise, "AUTH_STATUS_ERROR")
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
            bffFeature.testConnection().resolveOrReject(promise, "BFF_ERROR") { url ->
                Arguments.createMap().apply { putString("activeUrl", url) }
            }
        }
    }
}
