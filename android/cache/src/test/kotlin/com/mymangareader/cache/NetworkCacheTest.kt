package com.mymangareader.cache

import java.util.concurrent.atomic.AtomicInteger
import kotlin.test.assertEquals
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.yield
import org.junit.Test

class NetworkCacheTest {

    @Test
    fun `run executa o block e retorna seu resultado`() = runTest {
        val network = NetworkHandle()

        val result = network.run("k") { "value" }

        assertEquals("value", result)
    }

    @Test
    fun `run dentro do ttl reusa o resultado anterior, sem executar block de novo`() = runTest {
        val network = NetworkHandle()
        val calls = AtomicInteger(0)

        network.run("k", ttlMs = 60_000L) { calls.incrementAndGet(); "first" }
        val second = network.run("k", ttlMs = 60_000L) { calls.incrementAndGet(); "second" }

        assertEquals("first", second)
        assertEquals(1, calls.get())
    }

    @Test
    fun `run apos o ttl expirar executa o block novamente`() = runTest {
        val network = NetworkHandle()
        val calls = AtomicInteger(0)

        network.run("k", ttlMs = -1L) { calls.incrementAndGet(); "first" }
        val second = network.run("k", ttlMs = -1L) { calls.incrementAndGet(); "second" }

        assertEquals("second", second)
        assertEquals(2, calls.get())
    }

    @Test
    fun `keys diferentes nao compartilham cache nem lock entre si`() = runTest {
        val network = NetworkHandle()

        val a = network.run("a") { "value-a" }
        val b = network.run("b") { "value-b" }

        assertEquals("value-a", a)
        assertEquals("value-b", b)
    }

    @Test
    fun `chamadas concorrentes com a mesma key executam block uma unica vez (dedup in-flight)`() = runTest {
        val network = NetworkHandle()
        val calls = AtomicInteger(0)

        val results = (1..5).map {
            async {
                network.run("shared-key", ttlMs = 60_000L) {
                    calls.incrementAndGet()
                    delay(10)
                    "result"
                }
            }
        }.awaitAll()

        assertEquals(1, calls.get())
        assertEquals(List(5) { "result" }, results)
    }

    @Test
    fun `chamadas concorrentes com keys diferentes nao se bloqueiam mutuamente`() = runTest {
        val network = NetworkHandle()
        val calls = AtomicInteger(0)

        val results = (1..5).map { i ->
            async {
                network.run("key-$i", ttlMs = 60_000L) {
                    calls.incrementAndGet()
                    yield()
                    "result-$i"
                }
            }
        }.awaitAll()

        assertEquals(5, calls.get())
        assertEquals((1..5).map { "result-$it" }, results)
    }

    // ── invalidate / purgeExpired / purgeOlderThan (paridade com CacheStore) ────

    @Test
    fun `invalidate forca o proximo run a executar block de novo, mesmo dentro do ttl`() = runTest {
        val network = NetworkHandle()
        val calls = AtomicInteger(0)
        network.run("k", ttlMs = 60_000L) { calls.incrementAndGet(); "first" }

        network.invalidate("k")
        val second = network.run("k", ttlMs = 60_000L) { calls.incrementAndGet(); "second" }

        assertEquals("second", second)
        assertEquals(2, calls.get())
    }

    @Test
    fun `invalidate de uma key nao afeta outras`() = runTest {
        val network = NetworkHandle()
        network.run("a", ttlMs = 60_000L) { "value-a" }
        network.run("b", ttlMs = 60_000L) { "value-b" }

        network.invalidate("a")

        val calls = AtomicInteger(0)
        network.run("a", ttlMs = 60_000L) { calls.incrementAndGet(); "value-a-2" }
        val b = network.run("b", ttlMs = 60_000L) { calls.incrementAndGet(); "should-not-run" }

        assertEquals(1, calls.get())
        assertEquals("value-b", b)
    }

    @Test
    fun `purgeExpired remove somente entradas expiradas`() = runTest {
        val network = NetworkHandle()
        network.run("expired", ttlMs = -1L) { "1" }
        network.run("fresh", ttlMs = 60_000L) { "2" }

        network.purgeExpired()

        val calls = AtomicInteger(0)
        val expired = network.run("expired", ttlMs = 60_000L) { calls.incrementAndGet(); "re-fetched" }
        val fresh = network.run("fresh", ttlMs = 60_000L) { calls.incrementAndGet(); "should-not-run" }

        assertEquals("re-fetched", expired)
        assertEquals("2", fresh)
        assertEquals(1, calls.get())
    }

    @Test
    fun `purgeOlderThan nao remove entrada gravada antes do cutoff mas lida depois dele`() = runTest {
        val network = NetworkHandle()
        network.run("stale-but-read", ttlMs = 60_000L) { "1" }

        val cutoff = System.currentTimeMillis() + 1
        Thread.sleep(2)
        network.run("stale-but-read", ttlMs = 60_000L) { "should-not-run" } // toca lastAccessedAtEpochMs
        network.purgeOlderThan(cutoffEpochMs = cutoff)

        val calls = AtomicInteger(0)
        val result = network.run("stale-but-read", ttlMs = 60_000L) { calls.incrementAndGet(); "re-fetched" }

        assertEquals("1", result)
        assertEquals(0, calls.get())
    }

    @Test
    fun `purgeOlderThan remove entrada nunca lida de novo antes do cutoff`() = runTest {
        val network = NetworkHandle()
        network.run("never-read-again", ttlMs = 60_000L) { "1" }
        Thread.sleep(2)

        network.purgeOlderThan(cutoffEpochMs = System.currentTimeMillis())

        val calls = AtomicInteger(0)
        val result = network.run("never-read-again", ttlMs = 60_000L) { calls.incrementAndGet(); "re-fetched" }

        assertEquals("re-fetched", result)
        assertEquals(1, calls.get())
    }
}
