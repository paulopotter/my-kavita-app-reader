package com.mymangareader.cache

import kotlin.test.assertSame
import org.junit.Test

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
