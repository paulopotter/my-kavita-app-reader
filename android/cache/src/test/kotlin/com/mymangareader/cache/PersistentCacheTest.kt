package com.mymangareader.cache

import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.test.runTest
import org.junit.Test

class PersistentCacheTest {

    @Test
    fun `get retorna null quando a chave nunca foi gravada`() = runTest {
        val persistent = PersistentHandle(FakeCacheDao())

        assertNull(persistent.get("missing"))
    }

    @Test
    fun `put seguido de get retorna o value gravado, nao expirado`() = runTest {
        val persistent = PersistentHandle(FakeCacheDao())

        persistent.put("page:1", "\"hello\"", domain = "page", ttlMs = 60_000L)
        val result = persistent.get("page:1")

        assertEquals("\"hello\"", result?.value)
        assertFalse(result!!.isExpired)
    }

    @Test
    fun `get retorna isExpired true quando o ttl ja passou, sem apagar a entrada`() = runTest {
        val persistent = PersistentHandle(FakeCacheDao())

        persistent.put("page:1", "\"old\"", domain = "page", ttlMs = -1L)
        val result = persistent.get("page:1")

        assertTrue(result!!.isExpired)
        assertEquals("\"old\"", result.value)
    }

    @Test
    fun `invalidate remove apenas a chave indicada`() = runTest {
        val persistent = PersistentHandle(FakeCacheDao())
        persistent.put("a", "1", domain = "d")
        persistent.put("b", "2", domain = "d")

        persistent.invalidate("a")

        assertNull(persistent.get("a"))
        assertEquals("2", persistent.get("b")?.value)
    }

    @Test
    fun `invalidateDomain remove todas as entradas do dominio`() = runTest {
        val persistent = PersistentHandle(FakeCacheDao())
        persistent.put("a", "1", domain = "page")
        persistent.put("b", "2", domain = "page")
        persistent.put("c", "3", domain = "chapter")

        persistent.invalidateDomain("page")

        assertNull(persistent.get("a"))
        assertNull(persistent.get("b"))
        assertEquals("3", persistent.get("c")?.value)
    }

    @Test
    fun `purgeExpired remove somente entradas expiradas`() = runTest {
        val persistent = PersistentHandle(FakeCacheDao())
        persistent.put("expired", "1", domain = "d", ttlMs = -1L)
        persistent.put("fresh", "2", domain = "d", ttlMs = 60_000L)

        persistent.purgeExpired()

        assertNull(persistent.get("expired"))
        assertEquals("2", persistent.get("fresh")?.value)
    }
}
