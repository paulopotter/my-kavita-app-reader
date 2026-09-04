package com.mymangareader.tools.network

import com.mymangareader.cache.Cache
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import okhttp3.Call
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.Timer
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.concurrent.schedule

private const val CACHE_TTL_MS = 15 * 60 * 1000L

// Same watchdog pattern as RequestTool.kt, and for the same reason: `withTimeoutOrNull` alone
// does not reliably interrupt a blocking `Call.execute()` — it has no coroutine suspension point
// inside it, so a timed-out coroutine can only observe that the next time it actually suspends,
// which never happens until execute() itself returns (verified directly while diagnosing a real
// hang in this exact health-check path — the URL selection call blocked indefinitely with no
// timeout ever firing). A plain Timer thread, independent of coroutines, schedules `call.cancel()`
// after the candidate's own timeoutMs — cancelling the Call closes its socket, forcing a stuck
// execute() to throw immediately instead of leaking the thread.
private val healthCheckWatchdog = Timer("ActiveUrlSelector-watchdog", true)

// Outcome of probing ONE candidate's health check. `ok` is all a caller usually needs; `status`
// and `elapsedMs` are kept for diagnostics (a config-screen "test this URL" button shows only
// ok/failed but the rest is there for a debug view or logs). `status` is null when the request
// never got a response at all (DNS failure, connection refused, timeout).
data class UrlProbeResult(
    val url: String,
    val ok: Boolean,
    val status: Int?,
    val elapsedMs: Long,
)

interface UrlSelector {
    suspend fun getActiveUrl(candidates: List<UrlCandidate>): Result<String>

    suspend fun invalidateAndReselect(candidates: List<UrlCandidate>): Result<String>

    fun getLastKnownUrl(): String?

    // Hits a single candidate's health check once and reports what happened. Never touches the
    // cache or lastKnownUrl — it's a point check ("is this URL reachable right now?"), not a
    // selection. Used by the config screen's per-URL test button.
    suspend fun probe(candidate: UrlCandidate): UrlProbeResult
}

// One ActiveUrlSelector instance is shared across every group it's asked to resolve for (Server,
// ExternalMetadataServer, ...) — the cache key must identify WHICH group's candidate set is being
// resolved, not just "the last selection." Built from every candidate's own stable id
// (ServerUrlEntity.id/ExternalMetadataUrlEntity.id), sorted so the same group always produces the
// same key regardless of list ordering.
private fun candidatesCacheKey(candidates: List<UrlCandidate>): String = candidates.map { it.id }.sorted().joinToString(",")

@Singleton
class ActiveUrlSelector
    @Inject
    constructor(
        private val baseClient: OkHttpClient,
        private val cache: Cache,
    ) : UrlSelector {
        // A plain mirror of the last successful selection — never the cache's own source of truth
        // (that's Cache.network below). Exists only because getLastKnownUrl() is a real, synchronous
        // (non-suspend) function called outside any coroutine in several places today (e.g.
        // SetupModule.kt) — Cache.network's own methods are all suspend (backed by a real Mutex), so
        // they can't be called from there without a cascading suspend-ification this task doesn't
        // need. @Volatile guarantees this simple reference read/write is safe across threads without
        // needing a lock — there's no compound operation here that a Mutex would otherwise protect.
        @Volatile
        private var lastKnownUrl: String? = null

        override suspend fun getActiveUrl(candidates: List<UrlCandidate>): Result<String> {
            val key = candidatesCacheKey(candidates)
            // MMR-DIAG (backlog 015-telemetria-interna-debug): candidate set + cache key + winner for
            // the 15-min-cached selection. Uncomment when a "connected" dot won't go green.
            // Log.i(
            //     "MMR-DIAG",
            //     "getActiveUrl key=$key candidates=${candidates.map { "${it.url.trimEnd('/')}${it.healthCheckPath}" }}",
            // )
            val result = cache.network.run(key, CACHE_TTL_MS) { selectFastest(candidates) }
            // Log.i("MMR-DIAG", "getActiveUrl → ${result.getOrNull() ?: "FAIL: ${result.exceptionOrNull()?.message}"}")
            result.onSuccess { lastKnownUrl = it }
            return result
        }

        override fun getLastKnownUrl(): String? = lastKnownUrl

        override suspend fun invalidateAndReselect(candidates: List<UrlCandidate>): Result<String> {
            // MMR-DIAG (backlog 015-telemetria-interna-debug): the stale-cache drop a healthCheckPath
            // change relies on. Uncomment when a re-selection doesn't seem to take effect.
            // Log.i("MMR-DIAG", "invalidateAndReselect key=${candidatesCacheKey(candidates)}")
            cache.network.invalidate(candidatesCacheKey(candidates))
            return getActiveUrl(candidates)
        }

        override suspend fun probe(candidate: UrlCandidate): UrlProbeResult {
            val startedAt = System.currentTimeMillis()
            // Shares baseClient's dispatcher/connection pool — see selectFastest for the rationale.
            val client =
                baseClient
                    .newBuilder()
                    .connectTimeout(candidate.timeoutMs.toLong(), TimeUnit.MILLISECONDS)
                    .readTimeout(candidate.timeoutMs.toLong(), TimeUnit.MILLISECONDS)
                    .build()
            val url = candidate.url.trimEnd('/') + candidate.healthCheckPath
            // MMR-DIAG (backlog 015-telemetria-interna-debug): the exact URL probed + its status.
            // Uncomment when a health check's outcome is in doubt (was used to confirm M3's /api/health).
            // Log.i("MMR-DIAG", "probe → GET $url (timeout=${candidate.timeoutMs}ms)")
            val call: Call = client.newCall(Request.Builder().url(url).build())
            val timeoutTask = healthCheckWatchdog.schedule(candidate.timeoutMs.toLong()) { call.cancel() }
            return try {
                call.execute().use { response ->
                    UrlProbeResult(
                        url = candidate.url.trimEnd('/'),
                        ok = response.isSuccessful,
                        status = response.code,
                        elapsedMs = System.currentTimeMillis() - startedAt,
                    )
                    // .also { Log.i("MMR-DIAG", "probe ← $url status=${it.status} ok=${it.ok} ${it.elapsedMs}ms") }
                }
            } catch (e: Exception) {
                // Log.w("MMR-DIAG", "probe ✗ $url threw ${e.javaClass.simpleName}: ${e.message}")
                UrlProbeResult(
                    url = candidate.url.trimEnd('/'),
                    ok = false,
                    status = null,
                    elapsedMs = System.currentTimeMillis() - startedAt,
                )
            } finally {
                timeoutTask.cancel()
            }
        }

        private suspend fun selectFastest(candidates: List<UrlCandidate>): Result<String> =
            coroutineScope {
                if (candidates.isEmpty()) {
                    return@coroutineScope Result.failure(
                        IllegalStateException("No URL candidates configured"),
                    )
                }

                val sorted = candidates.sortedBy { it.priority }
                val winner =
                    sorted
                        .map { candidate ->
                            async {
                                val result = probe(candidate)
                                if (result.ok) candidate.url.trimEnd('/') else null
                            }
                        }.awaitAll()
                        .firstOrNull { it != null }

                if (winner != null) {
                    Result.success(winner)
                } else {
                    Result.failure(IllegalStateException("No URL responded to health check"))
                }
            }
    }
