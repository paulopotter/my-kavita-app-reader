package com.mymangareader.tools.network

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RequestTool @Inject constructor(private val client: OkHttpClient) {

    suspend fun request(
        url: String,
        method: String = "GET",
        headers: Map<String, String> = emptyMap(),
        body: String? = null,
    ): Result<HttpResult> = runCatching {
        val requestBody = body?.toRequestBody("application/json".toMediaType())

        val request = Request.Builder()
            .url(url)
            .method(method.uppercase(), if (method.uppercase() == "GET" || method.uppercase() == "DELETE") null else requestBody)
            .apply { headers.forEach { (k, v) -> addHeader(k, v) } }
            .build()

        client.newCall(request).execute().use { response ->
            HttpResult(
                status = response.code,
                body = response.body?.string() ?: "",
            )
        }
    }
}
