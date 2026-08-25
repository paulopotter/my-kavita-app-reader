package com.mymangareader.cache

import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.test.runTest
import org.junit.Test

class MemoryKotlinCacheTest {

    @Test
    fun `get retorna null quando a chave nunca foi gravada`() = runTest {
        val memory = MemoryKotlinHandle()

        assertNull(memory.get("missing"))
    }

    @Test
    fun `put seguido de get retorna o value gravado, nao expirado`() = runTest {
        val memory = MemoryKotlinHandle()

        memory.put("page:1", "\"hello\"", domain = "page", ttlMs = 60_000L)
        val result = memory.get("page:1")

        assertEquals("\"hello\"", result?.value)
        assertFalse(result!!.isExpired)
    }

    @Test
    fun `get retorna isExpired true quando o ttl ja passou, sem apagar a entrada`() = runTest {
        val memory = MemoryKotlinHandle()

        memory.put("page:1", "\"old\"", domain = "page", ttlMs = -1L)
        val result = memory.get("page:1")

        assertTrue(result!!.isExpired)
        assertEquals("\"old\"", result.value)
    }

    @Test
    fun `invalidate remove apenas a chave indicada`() = runTest {
        val memory = MemoryKotlinHandle()
        memory.put("a", "1", domain = "d")
        memory.put("b", "2", domain = "d")

        memory.invalidate("a")

        assertNull(memory.get("a"))
        assertEquals("2", memory.get("b")?.value)
    }

    @Test
    fun `invalidateDomain remove todas as entradas do dominio`() = runTest {
        val memory = MemoryKotlinHandle()
        memory.put("a", "1", domain = "page")
        memory.put("b", "2", domain = "page")
        memory.put("c", "3", domain = "chapter")

        memory.invalidateDomain("page")

        assertNull(memory.get("a"))
        assertNull(memory.get("b"))
        assertEquals("3", memory.get("c")?.value)
    }

    @Test
    fun `purgeExpired remove somente entradas expiradas`() = runTest {
        val memory = MemoryKotlinHandle()
        memory.put("expired", "1", domain = "d", ttlMs = -1L)
        memory.put("fresh", "2", domain = "d", ttlMs = 60_000L)

        memory.purgeExpired()

        assertNull(memory.get("expired"))
        assertEquals("2", memory.get("fresh")?.value)
    }
}
