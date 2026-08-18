package com.mymangareader.features.kavita.reader.ui

import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Coil has no built-in in-flight request dedup for plain execute()/enqueue() calls — two
 * independent requests for the same URL each run their own fetch+decode pipeline. [PagePreloader]
 * and the real [ReaderPageImage] render both request the same page URL around the same time (the
 * preload window includes the page right before it becomes visible), and their two concurrent
 * BitmapFactory/SafeBitmapDecoder reads over the same underlying disk-cache source were observed
 * on-device to race: one decode finishes and closes the source, the other's read then throws
 * IllegalStateException("closed") and that failed attempt is what sometimes ends up in the UI.
 * Serializing decodes per URL through this object removes the race — the loser just waits and
 * then hits Coil's memory cache instead of re-reading a closed stream.
 */
internal object PageDecodeCoordinator {
    private val locks = ConcurrentHashMap<String, Mutex>()

    // ConcurrentHashMap.getOrPut (the Kotlin extension) is get-then-put, not atomic — under real
    // concurrency two callers can both see a missing entry, each create their own Mutex, and each
    // lock a different instance, so neither actually blocks the other. That was observed on-device:
    // two SafeBitmapDecoder.decode() calls for the same URL entering within milliseconds of each
    // other with no serialization between them. ConcurrentHashMap.computeIfAbsent is atomic per key
    // and is what actually guarantees a single Mutex instance is ever installed for a given URL.
    suspend fun <T> withUrlLock(url: String, block: suspend () -> T): T =
        locks.computeIfAbsent(url) { Mutex() }.withLock { block() }
}
