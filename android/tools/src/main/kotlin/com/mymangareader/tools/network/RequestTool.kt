package com.mymangareader.tools.network

import java.util.Timer
import java.util.TimerTask
import kotlin.concurrent.schedule
import okhttp3.Call
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject
import javax.inject.Singleton

// Independent of OkHttpClient's own connect/read/write timeouts (NetworkModule.kt, 30s each) —
// those only fire if the socket is still "alive" at the TCP level; in real-world Android
// conditions (radio entering a power-saving/Doze state, a network switch mid-request, a
// half-open socket) a blocking Call.execute() can leave the calling thread stuck indefinitely
// without ever throwing, since the OS can suspend I/O before OkHttp's own timer completes.
//
// This backstop is deliberately NOT built on `withTimeout`/coroutine cancellation: `execute()`
// is a genuinely blocking JVM call with no coroutine suspension point inside it, so a cancelled
// coroutine can only observe that cancellation the next time it actually suspends — which never
// happens until execute() itself returns, and (verified while building this) `withTimeout`
// wrapping a real dispatcher hop is additionally flaky under `kotlinx-coroutines-test`'s virtual
// clock, which can fire the timeout instantly regardless of real elapsed time. Instead, a plain
// `java.util.Timer` (its own real, independent thread, nothing to do with coroutines) schedules
// `call.cancel()` after [timeoutMs] — cancelling an OkHttp Call closes its underlying socket,
// which makes a stuck execute() throw immediately and return the blocked thread. The timer task
// is always cancelled once execute() returns on its own, so the normal-response path pays
// nothing beyond scheduling/unscheduling one Timer entry.
private const val DEFAULT_REQUEST_TIMEOUT_MS = 35_000L
private val watchdog = Timer("RequestTool-watchdog", true)

@Singleton
class RequestTool @Inject constructor(private val client: OkHttpClient) {

    suspend fun request(
        url: String,
        method: String = "GET",
        headers: Map<String, String> = emptyMap(),
        body: String? = null,
        timeoutMs: Long = DEFAULT_REQUEST_TIMEOUT_MS,
    ): Result<HttpResult> = runCatching {
        val requestBody = body?.toRequestBody("application/json".toMediaType())

        val httpMethod = method.uppercase()
        val effectiveBody = when {
            httpMethod == "GET" || httpMethod == "DELETE" -> null
            requestBody != null -> requestBody
            else -> RequestBody.create(null, ByteArray(0))
        }
        val request = Request.Builder()
            .url(url)
            .method(httpMethod, effectiveBody)
            .apply { headers.forEach { (k, v) -> addHeader(k, v) } }
            .build()

        val call: Call = client.newCall(request)
        var timedOut = false
        val timeoutTask: TimerTask = watchdog.schedule(timeoutMs) {
            timedOut = true
            call.cancel()
        }
        try {
            call.execute().use { response ->
                HttpResult(
                    status = response.code,
                    body = response.body?.string() ?: "",
                )
            }
        } catch (e: Exception) {
            if (timedOut) throw RequestTimeoutException("Request timed out after ${timeoutMs}ms: $url")
            throw e
        } finally {
            timeoutTask.cancel()
        }
    }
}

class RequestTimeoutException(message: String) : Exception(message)
