package com.mymangareader.cache

import org.junit.Test
import kotlin.test.assertSame

class CacheTest {
    @Test
    fun `storeFor PERSISTENT retorna a instancia persistent`() {
        val cache = Cache(FakeCacheDao())

        assertSame(cache.persistent, cache.storeFor(CacheMode.PERSISTENT))
    }

    @Test
    fun `storeFor MEMORY_KOTLIN retorna a instancia memoryKotlin`() {
        val cache = Cache(FakeCacheDao())

        assertSame(cache.memoryKotlin, cache.storeFor(CacheMode.MEMORY_KOTLIN))
    }
}
