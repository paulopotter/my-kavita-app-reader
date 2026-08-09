package com.mymangareader.tools.network

import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withTimeoutOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

private const val CACHE_TTL_MS = 15 * 60 * 1000L

interface UrlSelector {
    suspend fun getActiveUrl(candidates: List<UrlCandidate>): Result<String>
    suspend fun invalidateAndReselect(candidates: List<UrlCandidate>): Result<String>
    fun getLastKnownUrl(): String?
}

@Singleton
class ActiveUrlSelector @Inject constructor() : UrlSelector {

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
                    val client = OkHttpClient.Builder()
                        .connectTimeout(candidate.timeoutMs.toLong(), TimeUnit.MILLISECONDS)
                        .readTimeout(candidate.timeoutMs.toLong(), TimeUnit.MILLISECONDS)
                        .build()
                    val url = candidate.url.trimEnd('/') + candidate.healthCheckPath
                    val ok = withTimeoutOrNull(candidate.timeoutMs.toLong()) {
                        runCatching {
                            client.newCall(Request.Builder().url(url).build())
                                .execute().use { it.isSuccessful }
                        }.getOrElse { false }
                    } ?: false
                    if (ok) candidate.url.trimEnd('/') else null
                }
            }.awaitAll().firstOrNull { it != null }

            if (winner != null) Result.success(winner)
            else Result.failure(IllegalStateException("No URL responded to health check"))
        }
}
