package com.mymangareader

import com.facebook.react.bridge.ReactApplicationContext
import com.mymangareader.cache.Cache
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mockito.kotlin.mock

// Every @ReactMethod here ends up calling Arguments.createMap() (via CacheEntry.toWritableMap()),
// which needs the native reactnativejni lib — not available under a plain JVM test, same
// limitation already documented in DigestBridgeModuleTest.kt/ReaderChapterModuleTest.kt. So the
// only thing verifiable here is wiring — getName() — with resolve/reject behavior covered by the
// real-device smoke test.
class CacheBridgeModuleTest {
    @Test
    fun `getName retorna CacheBridgeModule`() {
        val module = CacheBridgeModule(mock<Cache>(), mock<ReactApplicationContext>())

        assertEquals("CacheBridgeModule", module.name)
    }
}
