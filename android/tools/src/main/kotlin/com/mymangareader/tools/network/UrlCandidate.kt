package com.mymangareader.tools.network

data class UrlCandidate(
    val id: String,
    val url: String,
    val timeoutMs: Int,
    val priority: Int,
    val healthCheckPath: String,
)
