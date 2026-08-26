package com.mymangareader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.mymangareader.cache.Cache
import com.mymangareader.cache.CacheDescriptor
import com.mymangareader.cache.CacheEntry
import com.mymangareader.cache.CacheStore
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

// RN→Kotlin bridge for the :cache module's Cache facade — one @ReactMethod per CacheStore
// operation, prefixed persistentX/memoryKotlinX (Cache.persistent/Cache.memoryKotlin, both
// CacheStore). Never adds logic of its own: any decision belongs in Cache, not here. `variant`
// defaults to "" on the RN side too (CacheStore's own default) — a caller with no shape-changing
// parameter (e.g. Page) simply never passes it. Cache.network is deliberately NOT exposed here —
// its `block` parameter is a suspend Kotlin function, which cannot cross the RN↔Kotlin bridge
// (Promise only ever transports data, never a function to be invoked from JS); exposing get/set
// separately would lose the single-flight guarantee that only holds for calls staying entirely
// inside the Kotlin process. network stays Kotlin-internal until a real RN consumer needs it.
@Singleton
class CacheBridgeModule @Inject constructor(
    private val cache: Cache,
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "CacheBridgeModule"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // ── persistent ───────────────────────────────────────────────────────

    @ReactMethod
    fun persistentGet(key: String, variant: String, promise: Promise) = get(cache.persistent, key, variant, "PERSISTENT_GET_ERROR", promise)

    @ReactMethod
    fun persistentPut(key: String, value: String, domain: String, variant: String, ttlMs: Double?, promise: Promise) =
        put(cache.persistent, key, value, domain, variant, ttlMs, "PERSISTENT_PUT_ERROR", promise)

    @ReactMethod
    fun persistentInvalidate(key: String, variant: String, promise: Promise) =
        invalidate(cache.persistent, key, variant, "PERSISTENT_INVALIDATE_ERROR", promise)

    @ReactMethod
    fun persistentInvalidateDomain(domain: String, promise: Promise) =
        invalidateDomain(cache.persistent, domain, "PERSISTENT_INVALIDATE_DOMAIN_ERROR", promise)

    @ReactMethod
    fun persistentInvalidateVariant(domain: String, variant: String, promise: Promise) =
        invalidateVariant(cache.persistent, domain, variant, "PERSISTENT_INVALIDATE_VARIANT_ERROR", promise)

    @ReactMethod
    fun persistentPurgeExpired(promise: Promise) = purgeExpired(cache.persistent, "PERSISTENT_PURGE_EXPIRED_ERROR", promise)

    @ReactMethod
    fun persistentPurgeOlderThan(cutoffEpochMs: Double, promise: Promise) =
        purgeOlderThan(cache.persistent, cutoffEpochMs, "PERSISTENT_PURGE_OLDER_THAN_ERROR", promise)

    // ── memoryKotlin ─────────────────────────────────────────────────────

    @ReactMethod
    fun memoryKotlinGet(key: String, variant: String, promise: Promise) =
        get(cache.memoryKotlin, key, variant, "MEMORY_KOTLIN_GET_ERROR", promise)

    @ReactMethod
    fun memoryKotlinPut(key: String, value: String, domain: String, variant: String, ttlMs: Double?, promise: Promise) =
        put(cache.memoryKotlin, key, value, domain, variant, ttlMs, "MEMORY_KOTLIN_PUT_ERROR", promise)

    @ReactMethod
    fun memoryKotlinInvalidate(key: String, variant: String, promise: Promise) =
        invalidate(cache.memoryKotlin, key, variant, "MEMORY_KOTLIN_INVALIDATE_ERROR", promise)

    @ReactMethod
    fun memoryKotlinInvalidateDomain(domain: String, promise: Promise) =
        invalidateDomain(cache.memoryKotlin, domain, "MEMORY_KOTLIN_INVALIDATE_DOMAIN_ERROR", promise)

    @ReactMethod
    fun memoryKotlinInvalidateVariant(domain: String, variant: String, promise: Promise) =
        invalidateVariant(cache.memoryKotlin, domain, variant, "MEMORY_KOTLIN_INVALIDATE_VARIANT_ERROR", promise)

    @ReactMethod
    fun memoryKotlinPurgeExpired(promise: Promise) = purgeExpired(cache.memoryKotlin, "MEMORY_KOTLIN_PURGE_EXPIRED_ERROR", promise)

    @ReactMethod
    fun memoryKotlinPurgeOlderThan(cutoffEpochMs: Double, promise: Promise) =
        purgeOlderThan(cache.memoryKotlin, cutoffEpochMs, "MEMORY_KOTLIN_PURGE_OLDER_THAN_ERROR", promise)

    // ── shared CacheStore plumbing — persistent/memoryKotlin only differ by which store instance
    // and error code they pass in, never by behavior ─────────────────────

    private fun get(store: CacheStore, key: String, variant: String, errorCode: String, promise: Promise) {
        scope.launch {
            runCatching { store.get(key, variant) }.resolveOrReject(promise, errorCode) { it?.toWritableMap() }
        }
    }

    private fun put(store: CacheStore, key: String, value: String, domain: String, variant: String, ttlMs: Double?, errorCode: String, promise: Promise) {
        scope.launch {
            runCatching {
                if (ttlMs != null) store.put(key, value, domain, variant, ttlMs.toLong()) else store.put(key, value, domain, variant)
            }.resolveOrReject(promise, errorCode) { it.toWritableMap() }
        }
    }

    private fun invalidate(store: CacheStore, key: String, variant: String, errorCode: String, promise: Promise) {
        scope.launch {
            runCatching { store.invalidate(key, variant) }.resolveOrReject(promise, errorCode)
        }
    }

    private fun invalidateDomain(store: CacheStore, domain: String, errorCode: String, promise: Promise) {
        scope.launch {
            runCatching { store.invalidateDomain(domain) }.resolveOrReject(promise, errorCode)
        }
    }

    private fun invalidateVariant(store: CacheStore, domain: String, variant: String, errorCode: String, promise: Promise) {
        scope.launch {
            runCatching { store.invalidateVariant(domain, variant) }.resolveOrReject(promise, errorCode)
        }
    }

    private fun purgeExpired(store: CacheStore, errorCode: String, promise: Promise) {
        scope.launch {
            runCatching { store.purgeExpired() }.resolveOrReject(promise, errorCode)
        }
    }

    private fun purgeOlderThan(store: CacheStore, cutoffEpochMs: Double, errorCode: String, promise: Promise) {
        scope.launch {
            runCatching { store.purgeOlderThan(cutoffEpochMs.toLong()) }.resolveOrReject(promise, errorCode)
        }
    }

    private fun CacheEntry.toWritableMap() = Arguments.createMap().apply {
        putString("value", value)
        putDouble("cachedAtEpochMs", cachedAtEpochMs.toDouble())
        putDouble("ttlMs", ttlMs.toDouble())
        putBoolean("isExpired", isExpired)
    }

    private fun CacheDescriptor.toWritableMap() = Arguments.createMap().apply {
        putString("key", key)
        putString("variant", variant)
        putString("domain", domain)
        putString("mode", mode.name)
        putDouble("cachedAtEpochMs", cachedAtEpochMs.toDouble())
        putDouble("expiresAtEpochMs", expiresAtEpochMs.toDouble())
    }
}
