package com.mymangareader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.mymangareader.cache.CacheDescriptor
import com.mymangareader.cache.CacheEntry

// toWritableMap() for :cache's own types — public (unlike DigestBridgeMappers.kt's private
// helpers) because CacheDescriptor.toWritableMap() is also reused by DigestBridgeMappers.kt: a
// PageDigest/ChapterDigest/SeriesDigest carries its own CacheDescriptor (Success.cache) that needs
// the exact same shape CacheBridgeModule already produces for a direct persistentPut/memoryKotlinPut
// call — one mapping function, not two copies that could drift.

fun CacheEntry.toWritableMap(): WritableMap =
    Arguments.createMap().apply {
        putString("value", value)
        putDouble("cachedAtEpochMs", cachedAtEpochMs.toDouble())
        putDouble("ttlMs", ttlMs.toDouble())
        putBoolean("isExpired", isExpired)
    }

fun CacheDescriptor.toWritableMap(): WritableMap =
    Arguments.createMap().apply {
        putString("key", key)
        putString("variant", variant)
        putString("domain", domain)
        putString("mode", mode.name)
        putDouble("cachedAtEpochMs", cachedAtEpochMs.toDouble())
        putDouble("expiresAtEpochMs", expiresAtEpochMs.toDouble())
    }
