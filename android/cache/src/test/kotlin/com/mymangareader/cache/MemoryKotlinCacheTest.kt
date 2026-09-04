package com.mymangareader.cache

import kotlinx.coroutines.test.runTest
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class MemoryKotlinCacheTest {
    @Test
    fun `get retorna null quando a chave nunca foi gravada`() =
        runTest {
            val memory = MemoryKotlinHandle()

            assertNull(memory.get("missing"))
        }

    @Test
    fun `put seguido de get retorna o value gravado, nao expirado`() =
        runTest {
            val memory = MemoryKotlinHandle()

            memory.put("page:1", "\"hello\"", domain = "page", ttlMs = 60_000L)
            val result = memory.get("page:1")

            assertEquals("\"hello\"", result?.value)
            assertFalse(result!!.isExpired)
        }

    @Test
    fun `get retorna o mesmo ttlMs usado no put, para o caller reusar num refresh`() =
        runTest {
            val memory = MemoryKotlinHandle()

            memory.put("page:1", "\"hello\"", domain = "page", ttlMs = 12_345L)

            assertEquals(12_345L, memory.get("page:1")?.ttlMs)
        }

    @Test
    fun `put retorna um CacheDescriptor com mode MEMORY_KOTLIN refletindo o que foi escrito`() =
        runTest {
            val memory = MemoryKotlinHandle()

            val descriptor = memory.put("c1", "\"hello\"", domain = "chapter", variant = "full", ttlMs = 60_000L)

            assertEquals("c1", descriptor.key)
            assertEquals("full", descriptor.variant)
            assertEquals("chapter", descriptor.domain)
            assertEquals(CacheMode.MEMORY_KOTLIN, descriptor.mode)
            assertEquals(descriptor.cachedAtEpochMs + 60_000L, descriptor.expiresAtEpochMs)
        }

    @Test
    fun `get retorna isExpired true quando o ttl ja passou, sem apagar a entrada`() =
        runTest {
            val memory = MemoryKotlinHandle()

            memory.put("page:1", "\"old\"", domain = "page", ttlMs = -1L)
            val result = memory.get("page:1")

            assertTrue(result!!.isExpired)
            assertEquals("\"old\"", result.value)
        }

    @Test
    fun `mesma key com variants diferentes coexistem sem colidir`() =
        runTest {
            val memory = MemoryKotlinHandle()

            memory.put("c1", "full-payload", domain = "chapter", variant = "full:true")
            memory.put("c1", "light-payload", domain = "chapter", variant = "full:false")

            assertEquals("full-payload", memory.get("c1", variant = "full:true")?.value)
            assertEquals("light-payload", memory.get("c1", variant = "full:false")?.value)
        }

    @Test
    fun `invalidate remove apenas a chave indicada`() =
        runTest {
            val memory = MemoryKotlinHandle()
            memory.put("a", "1", domain = "d")
            memory.put("b", "2", domain = "d")

            memory.invalidate("a")

            assertNull(memory.get("a"))
            assertEquals("2", memory.get("b")?.value)
        }

    @Test
    fun `invalidateDomain remove todas as entradas do dominio`() =
        runTest {
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
    fun `invalidateVariant remove todas as entradas daquele dominio e variant, preservando outras variants e dominios`() =
        runTest {
            val memory = MemoryKotlinHandle()
            memory.put("c1", "1", domain = "chapter", variant = "full:true")
            memory.put("c2", "2", domain = "chapter", variant = "full:true")
            memory.put("c1", "3", domain = "chapter", variant = "full:false")
            memory.put("s1", "4", domain = "series", variant = "full:true")

            memory.invalidateVariant(domain = "chapter", variant = "full:true")

            assertNull(memory.get("c1", variant = "full:true"))
            assertNull(memory.get("c2", variant = "full:true"))
            assertEquals("3", memory.get("c1", variant = "full:false")?.value)
            assertEquals("4", memory.get("s1", variant = "full:true")?.value)
        }

    @Test
    fun `purgeExpired remove somente entradas expiradas`() =
        runTest {
            val memory = MemoryKotlinHandle()
            memory.put("expired", "1", domain = "d", ttlMs = -1L)
            memory.put("fresh", "2", domain = "d", ttlMs = 60_000L)

            memory.purgeExpired()

            assertNull(memory.get("expired"))
            assertEquals("2", memory.get("fresh")?.value)
        }

    @Test
    fun `purgeOlderThan nao remove entrada escrita antes do cutoff mas lida depois dele`() =
        runTest {
            val memory = MemoryKotlinHandle()
            memory.put("stale-but-read", "1", domain = "d")

            val cutoff = System.currentTimeMillis() + 1
            Thread.sleep(2)
            memory.get("stale-but-read") // toca lastAccessedAtEpochMs para depois do cutoff
            memory.purgeOlderThan(cutoffEpochMs = cutoff)

            assertEquals("1", memory.get("stale-but-read")?.value)
        }

    @Test
    fun `purgeOlderThan remove entrada nunca lida antes do cutoff`() =
        runTest {
            val memory = MemoryKotlinHandle()
            memory.put("never-read", "1", domain = "d")
            Thread.sleep(2)

            memory.purgeOlderThan(cutoffEpochMs = System.currentTimeMillis())

            assertNull(memory.get("never-read"))
        }

    @Test
    fun `purgeOlderThan nao remove nada quando cutoff e anterior a toda escrita`() =
        runTest {
            val memory = MemoryKotlinHandle()
            memory.put("a", "1", domain = "d")

            memory.purgeOlderThan(cutoffEpochMs = 0L)

            assertEquals("1", memory.get("a")?.value)
        }
}
