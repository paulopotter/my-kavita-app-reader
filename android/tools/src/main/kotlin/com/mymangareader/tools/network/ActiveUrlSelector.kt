package com.mymangareader.tools.network

import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import okhttp3.Call
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.Timer
import java.util.concurrent.TimeUnit
import kotlin.concurrent.schedule
import javax.inject.Inject
import javax.inject.Singleton

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

interface UrlSelector {
    suspend fun getActiveUrl(candidates: List<UrlCandidate>): Result<String>
    suspend fun invalidateAndReselect(candidates: List<UrlCandidate>): Result<String>
    fun getLastKnownUrl(): String?
}

@Singleton
class ActiveUrlSelector @Inject constructor(
    private val baseClient: OkHttpClient,
) : UrlSelector {

    private var cachedUrl: String? = null
    private var cacheTimestamp: Long = 0L

    override suspend fun getActiveUrl(candidates: List<UrlCandidate>): Result<String> {
        val now = System.currentTimeMillis()
        val cached = cachedUrl
        if (cached != null && (now - cacheTimestamp) < CACHE_TTL_MS) {
            return Result.success(cached)
        }
        return selectFastest(candidates).also { result ->
            result.onSuccess { url ->
                cachedUrl = url
                cacheTimestamp = System.currentTimeMillis()
            }
        }
    }

    override fun getLastKnownUrl(): String? = cachedUrl

    override suspend fun invalidateAndReselect(candidates: List<UrlCandidate>): Result<String> {
        cachedUrl = null
        cacheTimestamp = 0L
        return getActiveUrl(candidates)
    }

    private suspend fun selectFastest(candidates: List<UrlCandidate>): Result<String> =
        coroutineScope {
            if (candidates.isEmpty()) return@coroutineScope Result.failure(
                IllegalStateException("No URL candidates configured")
            )

            val sorted = candidates.sortedBy { it.priority }
            val winner = sorted.map { candidate ->
                async {
                    // Shares baseClient's dispatcher/connection pool (the expensive, poolable
                    // resources) instead of building a brand-new OkHttpClient — and therefore a
                    // new thread pool + connection pool — per candidate on every selection. Only
                    // the per-candidate timeouts are overridden via newBuilder().
                    val client = baseClient.newBuilder()
                        .connectTimeout(candidate.timeoutMs.toLong(), TimeUnit.MILLISECONDS)
                        .readTimeout(candidate.timeoutMs.toLong(), TimeUnit.MILLISECONDS)
                        .build()
                    val url = candidate.url.trimEnd('/') + candidate.healthCheckPath
                    val call: Call = client.newCall(Request.Builder().url(url).build())
                    val timeoutTask = healthCheckWatchdog.schedule(candidate.timeoutMs.toLong()) { call.cancel() }
                    val ok = try {
                        call.execute().use { it.isSuccessful }
                    } catch (e: Exception) {
                        false
                    } finally {
                        timeoutTask.cancel()
                    }
                    if (ok) candidate.url.trimEnd('/') else null
                }
            }.awaitAll().firstOrNull { it != null }

            if (winner != null) Result.success(winner)
            else Result.failure(IllegalStateException("No URL responded to health check"))
        }
}
