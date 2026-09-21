package com.mymangareader.externalmetadataserver.plugins.m3

import com.mymangareader.cache.Cache
import com.mymangareader.externalmetadataserver.plugins.CredentialField
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataAlternativeTitle
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataExternalIds
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataMatch
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataPlugin
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataPluginRegistration
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataSeriesRef
import com.mymangareader.tools.network.RequestTool
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.text.Normalizer

class M3PluginException(
    message: String,
) : Exception(message)

private const val MANGAS_PATH = "/manga" // endpoint returns a list despite the singular URL segment

// Per-series lookup, qualified by which content provider the id belongs to. The provider segment
// is the caller's own providerId (a value declared in app code, e.g. "kavita"), so M3 resolves
// "this exact series on that server" instead of guessing from a title. Richer than the listing —
// summary/genres/author/alternative titles only exist here.
private fun mangaByIdPath(
    providerId: String,
    id: String,
) = "/manga/by-id/$providerId/$id"

// The LISTING's cache window, deliberately much wider than ExternalMetadataPlugin.
// DEFAULT_READ_PROTECTION_WINDOW_MS (3s, meant for "redundant back-to-back reads only"): the
// listing is one big response serving many series, and fetchMatch still falls back to it for a
// series the per-series lookup doesn't know. A caller resolving series one at a time in sequence
// (SeriesDigest looping over the whole library) would otherwise re-download it on every miss.
// 180s covers a realistic full-loop duration without serving data much staler than that.
private const val M3_MANGA_LIST_CACHE_WINDOW_MS = 180_000L

// Cache.network's key for this plugin's listing — keyed by baseUrl, not by plugin instance, since
// resolvePlugin (ExternalMetadataServer) builds a fresh M3Plugin instance on every resolution;
// keying by baseUrl lets the single-flight/TTL window survive that recreation instead of
// resetting on every call, unlike the old instance-scoped Mutex/Map this replaced.
private fun mangaListCacheKey(baseUrl: String) = "m3:manga-list:$baseUrl"

// Per-series lookups get their own key and the SAME window as the listing. An earlier version
// gave them the contract's 3s "back-to-back reads" guard, which was wrong in practice: opening a
// series is a user action that repeats over a session (open, back, open again), and 3s meant
// almost every open paid for a fresh round trip — on the critical path, since the digest waits
// for this before rendering anything. Enrichment metadata changes on the order of a scan, not of
// a navigation, so a series resolved a minute ago is still the right answer.
private fun mangaByIdCacheKey(
    baseUrl: String,
    providerId: String,
    id: String,
) = "m3:manga-by-id:$baseUrl:$providerId:$id"

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

        override val defaultHealthCheckPath: String = "/api/health"

        override val factory = { requestTool: RequestTool, cache: Cache, baseUrl: String, _: String ->
            M3Plugin(baseUrl, requestTool, cache) as ExternalMetadataPlugin
        }
    }

    @Serializable
    private data class ExternalIdsDto(
        @SerialName("mal_id") val malId: Int? = null,
        @SerialName("anilist_id") val anilistId: Int? = null,
        @SerialName("nexus_id") val nexusId: Int? = null,
        @SerialName("onyxreader_id") val onyxreaderId: Int? = null,
    )

    @Serializable
    private data class AlternativeTitleDto(
        val label: String,
        val value: String,
    )

    // The per-series route's response. A superset of MangaDto, kept as its own type rather than
    // widening MangaDto with optional fields: that would make the listing look like it answers
    // summary/genres/author when it simply never carries them.
    @Serializable
    private data class MangaDetailDto(
        val slug: String? = null,
        val title: String,
        val status: String? = null,
        val abandoned: Boolean = false,
        val summary: String? = null,
        val author: String? = null,
        val genres: List<String> = emptyList(),
        @SerialName("alternative_titles") val alternativeTitles: List<AlternativeTitleDto> = emptyList(),
        @SerialName("downloaded_chapters_count") val downloadedChapters: Int? = null,
        @SerialName("known_chapters_total") val totalChapters: Int? = null,
        @SerialName("latest_chapter_number") val latestChapterLabel: String? = null,
        @SerialName("has_errors") val hasErrors: Boolean = false,
        @SerialName("external_ids") val externalIds: ExternalIdsDto? = null,
    )

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

    override val auth: ExternalMetadataPlugin.Auth =
        object : ExternalMetadataPlugin.Auth {
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

    // Single-series lookup, in two steps. First the provider-qualified route, which resolves the
    // series by (providerId, id) and carries everything M3 knows about it. When M3 has no entry
    // under that pair it answers 404, and we fall back to scanning the listing by normalized
    // title — the pre-existing behavior, and still the only way to match a series M3 knows but
    // never recorded a content-provider id for. A 404 is therefore "not indexed under this id",
    // not "no such series", which is why it must not short-circuit to null.
    //
    // The fallback's match is necessarily thinner: the listing carries no summary/genres/author
    // (see ExternalMetadataMatch's note on partial population).
    override suspend fun fetchMatch(series: ExternalMetadataSeriesRef): ExternalMetadataMatch? {
        fetchMangaById(series)?.let { return it.toExternalMetadataMatch(series.id) }

        val dto = fetchAllManga().firstOrNull { it.title.normalizedForMatch() == series.name.normalizedForMatch() }
        return dto?.toExternalMetadataMatch(series.id)
    }

    // null means "M3 has no entry under this (providerId, id)" — a real answer (HTTP 404), not a
    // failure. Any other non-200 is a genuine failure and throws, same as the listing's.
    private suspend fun fetchMangaById(series: ExternalMetadataSeriesRef): MangaDetailDto? =
        cache.network.run(
            mangaByIdCacheKey(baseUrl, series.providerId, series.id),
            ttlMs = M3_MANGA_LIST_CACHE_WINDOW_MS,
        ) { fetchMangaByIdFromNetwork(series) }

    private suspend fun fetchMangaByIdFromNetwork(series: ExternalMetadataSeriesRef): MangaDetailDto? {
        val http =
            requestTool
                .request(
                    url = "$baseUrl${mangaByIdPath(series.providerId, series.id)}",
                    method = "GET",
                ).getOrElse { throw M3PluginException("M3 fetch failed: ${it.message}") }

        if (http.status == 404) return null
        if (http.status != 200) throw M3PluginException("M3 fetch failed: HTTP ${http.status}")

        return m3Json.decodeFromString(http.body)
    }

    // Memoized within M3_MANGA_LIST_CACHE_WINDOW_MS (180s — see its own doc for why this is much
    // wider than ExternalMetadataPlugin.DEFAULT_READ_PROTECTION_WINDOW_MS). Single-flight + TTL
    // via Cache.network — whichever caller gets there first fetches and stores the result, any
    // concurrent caller within the window (across any M3Plugin instance keyed to this baseUrl)
    // reuses it instead of firing its own request. No invalidation path — this plugin has no
    // write operations that could make the cached listing stale.
    private suspend fun fetchAllManga(): List<MangaDto> = cache.network.run(mangaListCacheKey(baseUrl), ttlMs = M3_MANGA_LIST_CACHE_WINDOW_MS) { fetchAllMangaFromNetwork() }

    private suspend fun fetchAllMangaFromNetwork(): List<MangaDto> {
        val http =
            requestTool
                .request(
                    url = "$baseUrl$MANGAS_PATH",
                    method = "GET",
                ).getOrElse { throw M3PluginException("M3 fetch failed: ${it.message}") }

        if (http.status != 200) throw M3PluginException("M3 fetch failed: HTTP ${http.status}")

        return m3Json.decodeFromString(http.body)
    }

    // The rich mapping — everything M3 knows. Its counterpart below (MangaDto) fills only what a
    // listing row carries, leaving the descriptive fields at their defaults.
    private fun MangaDetailDto.toExternalMetadataMatch(seriesId: String) =
        ExternalMetadataMatch(
            seriesId = seriesId,
            slug = slug,
            status = status ?: "unknown",
            downloadedChapters = downloadedChapters,
            totalChapters = totalChapters,
            latestChapterLabel = latestChapterLabel,
            hasErrors = hasErrors,
            abandoned = abandoned,
            summary = summary,
            author = author,
            genres = genres,
            alternativeTitles = alternativeTitles.map { ExternalMetadataAlternativeTitle(label = it.label, value = it.value) },
            externalIds =
                externalIds?.let {
                    ExternalMetadataExternalIds(
                        malId = it.malId,
                        anilistId = it.anilistId,
                        nexusId = it.nexusId,
                        onyxreaderId = it.onyxreaderId,
                    )
                },
        )

    private fun MangaDto.toExternalMetadataMatch(seriesId: String) =
        ExternalMetadataMatch(
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
    Normalizer
        .normalize(this, Normalizer.Form.NFD)
        .replace(Regex("\\p{Mn}+"), "")
        .lowercase()
        .replace(Regex("[.,;:!?'\"()\\[\\]{}]"), "")
        .replace(Regex("\\s+"), " ")
        .trim()
