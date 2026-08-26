package com.mymangareader.externalmetadataserver.plugins.m3

import com.mymangareader.cache.Cache
import com.mymangareader.externalmetadataserver.plugins.CredentialField
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataMatch
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataPlugin
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataPluginRegistration
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataSeriesRef
import com.mymangareader.tools.network.RequestTool
import java.text.Normalizer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

class M3PluginException(message: String) : Exception(message)

private const val MANGAS_PATH = "/manga" // endpoint returns a list despite the singular URL segment

// M3's own cache window, deliberately much wider than ExternalMetadataPlugin.
// DEFAULT_READ_PROTECTION_WINDOW_MS (3s, meant for "redundant back-to-back reads only") — M3 has
// no single-series endpoint, so a caller resolving many series one at a time in sequence (e.g.
// SeriesDigest looping over the whole library — 119 series today) would otherwise re-download
// the entire /manga listing on every single fetchMatch() call. 180s covers a realistic full-loop
// duration without serving data much staler than that.
private const val M3_MANGA_LIST_CACHE_WINDOW_MS = 180_000L

// Cache.network's key for this plugin's listing — keyed by baseUrl, not by plugin instance, since
// resolvePlugin (ExternalMetadataServer) builds a fresh M3Plugin instance on every resolution;
// keying by baseUrl lets the single-flight/TTL window survive that recreation instead of
// resetting on every call, unlike the old instance-scoped Mutex/Map this replaced.
private fun mangaListCacheKey(baseUrl: String) = "m3:manga-list:$baseUrl"

private val m3Json = Json { ignoreUnknownKeys = true }

/**
 * Translates the raw "M3" (My Mangá Manager — personal BFF) HTTP API into
 * [ExternalMetadataPlugin]'s provider-agnostic shape. Inspired by today's `BffFeature` (`/manga`
 * endpoint, match by `kavita_id` then normalized title) but written from scratch against the new
 * contract — no code copied over.
 *
 * M3 has no auth today — [Auth] is a real no-op, not a stub: every method does nothing (or
 * returns null) — a normal, permanent state for this provider (same convention `ServerPlugin.
 * Auth` already uses for a provider with no session concept).
 */
class M3Plugin(
    private val baseUrl: String,
    private val requestTool: RequestTool,
    private val cache: Cache,
) : ExternalMetadataPlugin {

    override val id: String = Info.id
    override val displayName: String = Info.displayName
    override val version: String = Info.version

    companion object Info : ExternalMetadataPluginRegistration {
        override val id: String = "m3"
        override val displayName: String = "My Mangá Manager" // personal BFF
        override val version: String = "1.0.0"

        override val credentialFields: List<CredentialField> = emptyList()

        override val factory = { requestTool: RequestTool, cache: Cache, baseUrl: String, _: String ->
            M3Plugin(baseUrl, requestTool, cache) as ExternalMetadataPlugin
        }
    }

    @Serializable
    private data class MangaDto(
        val slug: String? = null,
        val title: String,
        val status: String? = null,
        @SerialName("downloaded_chapters_count") val downloadedChapters: Int? = null,
        @SerialName("known_chapters_total") val totalChapters: Int? = null,
        @SerialName("latest_chapter_number") val latestChapterLabel: String? = null,
        @SerialName("has_errors") val hasErrors: Boolean = false,
        @SerialName("kavita_id") val kavitaId: Int? = null,
    )

    override val auth: ExternalMetadataPlugin.Auth = object : ExternalMetadataPlugin.Auth {
        override suspend fun authenticate() = Unit
        override suspend fun checkToken(): String? = null
        override suspend fun reauthenticate() = Unit
        override suspend fun logout() = Unit
        override fun getSession(): String? = null
    }

    // Positional — result[i] is series[i]'s match, or null if none was found. Never drops
    // entries (a previous version used mapNotNull, which lost the series↔match correlation for
    // any caller not tracking seriesId itself).
    override suspend fun fetchMatches(series: List<ExternalMetadataSeriesRef>): List<ExternalMetadataMatch?> {
        val byKavitaId = mutableMapOf<String, MangaDto>()
        val byNormalizedName = mutableMapOf<String, MangaDto>()
        fetchAllManga().forEach { dto ->
            dto.kavitaId?.let { byKavitaId[it.toString()] = dto }
            byNormalizedName[dto.title.normalizedForMatch()] = dto
        }

        return series.map { ref ->
            val dto = byKavitaId[ref.id] ?: byNormalizedName[ref.name.normalizedForMatch()]
            dto?.toExternalMetadataMatch(ref.id)
        }
    }

    // Single-series lookup — M3's real API has no "one manga" endpoint, only the same full
    // /manga listing fetchMatches uses, so this reuses fetchAllManga() and filters to just the
    // requested series. Kept as its own contract operation (not "call fetchMatches with a list
    // of 1 and take the first result") so a future provider with a real single-lookup endpoint
    // can implement this differently without reshaping the contract.
    override suspend fun fetchMatch(series: ExternalMetadataSeriesRef): ExternalMetadataMatch? {
        val dto = fetchAllManga().firstOrNull {
            it.kavitaId?.toString() == series.id || it.title.normalizedForMatch() == series.name.normalizedForMatch()
        }
        return dto?.toExternalMetadataMatch(series.id)
    }

    // Memoized within M3_MANGA_LIST_CACHE_WINDOW_MS (180s — see its own doc for why this is much
    // wider than ExternalMetadataPlugin.DEFAULT_READ_PROTECTION_WINDOW_MS). Single-flight + TTL
    // via Cache.network — whichever caller gets there first fetches and stores the result, any
    // concurrent caller within the window (across any M3Plugin instance keyed to this baseUrl)
    // reuses it instead of firing its own request. No invalidation path — this plugin has no
    // write operations that could make the cached listing stale.
    private suspend fun fetchAllManga(): List<MangaDto> =
        cache.network.run(mangaListCacheKey(baseUrl), ttlMs = M3_MANGA_LIST_CACHE_WINDOW_MS) { fetchAllMangaFromNetwork() }

    private suspend fun fetchAllMangaFromNetwork(): List<MangaDto> {
        val http = requestTool.request(
            url = "$baseUrl$MANGAS_PATH",
            method = "GET",
        ).getOrElse { throw M3PluginException("M3 fetch failed: ${it.message}") }

        if (http.status != 200) throw M3PluginException("M3 fetch failed: HTTP ${http.status}")

        return m3Json.decodeFromString(http.body)
    }

    private fun MangaDto.toExternalMetadataMatch(seriesId: String) = ExternalMetadataMatch(
        seriesId = seriesId,
        slug = slug,
        status = status ?: "unknown",
        downloadedChapters = downloadedChapters,
        totalChapters = totalChapters,
        latestChapterLabel = latestChapterLabel,
        hasErrors = hasErrors,
    )
}

private fun String.normalizedForMatch(): String =
    Normalizer.normalize(this, Normalizer.Form.NFD)
        .replace(Regex("\\p{Mn}+"), "")
        .lowercase()
        .replace(Regex("[.,;:!?'\"()\\[\\]{}]"), "")
        .replace(Regex("\\s+"), " ")
        .trim()
