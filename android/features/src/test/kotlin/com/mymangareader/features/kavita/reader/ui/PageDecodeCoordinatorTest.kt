package com.mymangareader.features.kavita.reader.ui

import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test

class PageDecodeCoordinatorTest {

    @Test
    fun `withUrlLock serializes concurrent callers for the same key`() = runBlocking {
        val concurrentCount = AtomicInteger(0)
        var maxObservedConcurrency = 0

        val jobs = List(5) {
            async {
                PageDecodeCoordinator.withUrlLock("same-key") {
                    val current = concurrentCount.incrementAndGet()
                    maxObservedConcurrency = maxOf(maxObservedConcurrency, current)
                    delay(10)
                    concurrentCount.decrementAndGet()
                }
            }
        }
        jobs.forEach { it.await() }

        assertEquals(1, maxObservedConcurrency)
    }

    // Regression test for a real on-device race: single-threaded coroutine dispatchers (like the
    // one runBlocking above uses) never expose ConcurrentHashMap.getOrPut's lack of atomicity,
    // since only one coroutine ever runs at a time. Real OS threads racing to install the first
    // Mutex for a key is what exposed it — two SafeBitmapDecoder.decode() calls landed within
    // milliseconds of each other on different threads and neither actually blocked the other.
    @Test
    fun `withUrlLock serializes real concurrent OS threads racing to install the first lock`() {
        val threadCount = 20
        val pool = Executors.newFixedThreadPool(threadCount)
        val startLatch = CountDownLatch(1)
        val doneLatch = CountDownLatch(threadCount)
        val concurrentCount = AtomicInteger(0)
        val maxObservedConcurrency = AtomicInteger(0)

        repeat(threadCount) {
            pool.submit {
                startLatch.await()
                runBlocking {
                    PageDecodeCoordinator.withUrlLock("racing-key") {
                        val current = concurrentCount.incrementAndGet()
                        maxObservedConcurrency.updateAndGet { max -> maxOf(max, current) }
                        Thread.sleep(5)
                        concurrentCount.decrementAndGet()
                    }
                }
                doneLatch.countDown()
            }
        }
        startLatch.countDown()
        doneLatch.await()
        pool.shutdown()

        assertEquals(1, maxObservedConcurrency.get())
    }

    @Test
    fun `withUrlLock allows different keys to run concurrently`() = runBlocking {
        val concurrentCount = AtomicInteger(0)
        var maxObservedConcurrency = 0

        val jobs = listOf("key-a", "key-b", "key-c").map { key ->
            async {
                PageDecodeCoordinator.withUrlLock(key) {
                    val current = concurrentCount.incrementAndGet()
                    maxObservedConcurrency = maxOf(maxObservedConcurrency, current)
                    delay(10)
                    concurrentCount.decrementAndGet()
                }
            }
        }
        jobs.forEach { it.await() }

        assertEquals(3, maxObservedConcurrency)
    }
}
