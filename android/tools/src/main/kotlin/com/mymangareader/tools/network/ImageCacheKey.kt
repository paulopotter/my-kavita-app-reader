package com.mymangareader.tools.network

import java.net.URI

/**
 * The key a page image is cached under: its path and query, WITHOUT the host and WITHOUT the
 * `apiKey` parameter.
 *
 * The same Kavita page is reachable through several hosts (the LAN address, the public DDNS one)
 * and the active one changes with the network. Keyed by the full URL, each host got its own copy
 * of the same bytes — and a host switch re-downloaded everything it already had. Keyed by path,
 * the page is cached once and served from disk whichever address is active. Dropping `apiKey`
 * also keeps the secret out of the on-disk cache's file names and of the logs.
 *
 * A string that doesn't parse as a URL is returned untouched.
 */
fun stableImageCacheKey(url: String): String {
    val uri = runCatching { URI(url) }.getOrNull() ?: return url
    val path = uri.rawPath?.takeIf { it.isNotEmpty() } ?: return url
    val query =
        uri.rawQuery
            ?.split('&')
            ?.filterNot { it.startsWith("apiKey=") || it == "apiKey" }
            ?.joinToString("&")
            ?.takeIf { it.isNotEmpty() }
    return if (query == null) path else "$path?$query"
}

/** [url] with its `apiKey` value replaced, safe to write to a log. */
fun redactApiKey(url: String): String = url.replace(Regex("""(apiKey=)[^&\s"]+"""), "$1***")
