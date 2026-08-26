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
    fun `get retorna o mesmo ttlMs usado no put, para o caller reusar num refresh`() = runTest {
        val persistent = PersistentHandle(FakeCacheDao())

        persistent.put("page:1", "\"hello\"", domain = "page", ttlMs = 12_345L)

        assertEquals(12_345L, persistent.get("page:1")?.ttlMs)
    }

    @Test
    fun `put retorna um CacheDescriptor com mode PERSISTENT refletindo o que foi escrito`() = runTest {
        val persistent = PersistentHandle(FakeCacheDao())

        val descriptor = persistent.put("c1", "\"hello\"", domain = "chapter", variant = "full", ttlMs = 60_000L)

        assertEquals("c1", descriptor.key)
        assertEquals("full", descriptor.variant)
        assertEquals("chapter", descriptor.domain)
        assertEquals(CacheMode.PERSISTENT, descriptor.mode)
        assertEquals(descriptor.cachedAtEpochMs + 60_000L, descriptor.expiresAtEpochMs)
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
    fun `mesma key com variants diferentes coexistem sem colidir`() = runTest {
        val persistent = PersistentHandle(FakeCacheDao())

        persistent.put("c1", "full-payload", domain = "chapter", variant = "full:true")
        persistent.put("c1", "light-payload", domain = "chapter", variant = "full:false")

        assertEquals("full-payload", persistent.get("c1", variant = "full:true")?.value)
        assertEquals("light-payload", persistent.get("c1", variant = "full:false")?.value)
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
    fun `invalidateVariant remove todas as entradas daquele dominio e variant, preservando outras variants e dominios`() = runTest {
        val persistent = PersistentHandle(FakeCacheDao())
        persistent.put("c1", "1", domain = "chapter", variant = "full:true")
        persistent.put("c2", "2", domain = "chapter", variant = "full:true")
        persistent.put("c1", "3", domain = "chapter", variant = "full:false")
        persistent.put("s1", "4", domain = "series", variant = "full:true")

        persistent.invalidateVariant(domain = "chapter", variant = "full:true")

        assertNull(persistent.get("c1", variant = "full:true"))
        assertNull(persistent.get("c2", variant = "full:true"))
        assertEquals("3", persistent.get("c1", variant = "full:false")?.value)
        assertEquals("4", persistent.get("s1", variant = "full:true")?.value)
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

    @Test
    fun `purgeOlderThan remove somente entradas escritas antes do cutoff e nunca lidas depois`() = runTest {
        val dao = FakeCacheDao()
        val persistent = PersistentHandle(dao)
        dao.upsert(cacheEntity("stale", cachedAtEpochMs = 1_000L, lastAccessedAtEpochMs = 1_000L))
        dao.upsert(cacheEntity("recently-read", cachedAtEpochMs = 1_000L, lastAccessedAtEpochMs = 9_000L))
        dao.upsert(cacheEntity("fresh", cachedAtEpochMs = 9_000L, lastAccessedAtEpochMs = 9_000L))

        persistent.purgeOlderThan(cutoffEpochMs = 5_000L)

        assertNull(dao.getByKey("stale", ""))
        assertTrue(dao.getByKey("recently-read", "") != null)
        assertTrue(dao.getByKey("fresh", "") != null)
    }

    private fun cacheEntity(
        key: String,
        variant: String = "",
        domain: String = "d",
        cachedAtEpochMs: Long,
        expiresAtEpochMs: Long = cachedAtEpochMs + 60_000L,
        lastAccessedAtEpochMs: Long,
    ) = com.mymangareader.core.database.CacheEntity(
        key = key,
        variant = variant,
        value = "v",
        domain = domain,
        cachedAtEpochMs = cachedAtEpochMs,
        ttlMs = expiresAtEpochMs - cachedAtEpochMs,
        expiresAtEpochMs = expiresAtEpochMs,
        lastAccessedAtEpochMs = lastAccessedAtEpochMs,
    )
}
