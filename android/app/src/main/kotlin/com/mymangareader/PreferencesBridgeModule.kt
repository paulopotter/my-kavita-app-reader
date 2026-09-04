package com.mymangareader

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.mymangareader.preferences.Preferences
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

// RN→Kotlin bridge for the :preferences module's Preferences facade — one @ReactMethod per
// operation, same shape as CacheBridgeModule but unprefixed (Preferences has a single backend,
// unlike Cache's persistent/memoryKotlin/network split — there's no store to disambiguate).
// Never adds logic of its own: any decision belongs in Preferences, not here.
@Singleton
class PreferencesBridgeModule
    @Inject
    constructor(
        private val preferences: Preferences,
        context: ReactApplicationContext,
    ) : ReactContextBaseJavaModule(context) {
        override fun getName(): String = "PreferencesBridgeModule"

        private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

        @ReactMethod
        fun get(
            key: String,
            variant: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching { preferences.get(key, variant) }.resolveOrReject(promise, "PREFERENCES_GET_ERROR") { it?.toWritableMap() }
            }
        }

        @ReactMethod
        fun put(
            key: String,
            value: String,
            domain: String,
            variant: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching { preferences.put(key, value, domain, variant) }
                    .resolveOrReject(promise, "PREFERENCES_PUT_ERROR") { it.toWritableMap() }
            }
        }

        @ReactMethod
        fun delete(
            key: String,
            variant: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching { preferences.delete(key, variant) }.resolveOrReject(promise, "PREFERENCES_DELETE_ERROR")
            }
        }

        @ReactMethod
        fun deleteDomain(
            domain: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching { preferences.deleteDomain(domain) }.resolveOrReject(promise, "PREFERENCES_DELETE_DOMAIN_ERROR")
            }
        }
    }
