package com.mymangareader.tools.cache

import com.mymangareader.cache.Cache
import com.mymangareader.cache.CacheDescriptor
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Fire-and-forget: runs [fetchFn] on its own coroutine scope (never the caller's structured
 * concurrency — the caller has already returned by the time this finishes) and, if a
 * [CacheDescriptor] is given, writes the result back into whichever [Cache] store that
 * descriptor's `mode` resolves to ([Cache.storeFor]).
 *
 * The typical caller is a digest builder (`:content-digest`) returning a stale cached value: it
 * calls [launchWithStore] with a `fetchFn` that re-fetches the same data and the [CacheDescriptor]
 * the stale value came from, so the cache gets refreshed without the original caller waiting for
 * it.
 *
 * Both [launch] and [launchWithStore] return the [Job] they started — never awaited internally —
 * so a caller that wants to react once the refresh actually finishes (e.g. emitting an `EventBus`
 * event, once that exists) can call `job.invokeOnCompletion { ... }` itself. BackgroundExecute
 * never knows about EventBus or any other downstream reaction.
 */
@Singleton
class BackgroundExecute
    @Inject
    constructor(
        private val cache: Cache,
    ) {
        private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

        /** Runs [fetchFn] in the background — nothing is written to any cache. */
        fun launch(fetchFn: suspend () -> String): Job = execute(fetchFn, descriptor = null)

        /** Runs [fetchFn] in the background, then writes its result into [descriptor]'s own store/key. */
        fun launchWithStore(
            fetchFn: suspend () -> String,
            descriptor: CacheDescriptor,
        ): Job = execute(fetchFn, descriptor)

        // Shared engine — launch()/launchWithStore() are the only two named entry points, this is
        // never called directly from outside.
        private fun execute(
            fetchFn: suspend () -> String,
            descriptor: CacheDescriptor?,
        ): Job =
            scope.launch {
                val value = fetchFn()
                if (descriptor != null) {
                    cache.storeFor(descriptor.mode).put(
                        key = descriptor.key,
                        value = value,
                        domain = descriptor.domain,
                        variant = descriptor.variant,
                        ttlMs = descriptor.expiresAtEpochMs - descriptor.cachedAtEpochMs,
                    )
                }
            }
    }
