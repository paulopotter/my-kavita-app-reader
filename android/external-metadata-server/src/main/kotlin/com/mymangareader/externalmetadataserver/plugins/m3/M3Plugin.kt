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
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.net.URLEncoder
import java.text.Normalizer

class M3PluginException(
    message: String,
) : Exception(message)

private const val API_V1 = "/api/v1"

// The search cap for the title fallback. A title search is a lookup for ONE series, so a handful
// of candidates is plenty; a title that matches more than this is too generic to resolve anyway.
private const val SEARCH_LIMIT = 20

// How many alternative-title candidates are opened (one detail request each) when no card title
// matched exactly. Bounds the worst case of the fallback to a fixed number of requests.
private const val ALTERNATIVE_TITLE_CANDIDATES = 5

// fetchMatches resolves a whole library, one series at a time. Unbounded, that is one request per
// series fired at once at a personal server; 4 keeps it quick without flooding it.
private const val FETCH_MATCHES_CONCURRENCY = 4

// Per-series lookups are a user action that repeats over a session (open, back, open again), and
// the digest waits on this before rendering — so a series resolved a minute ago is still the right
// answer. Enrichment metadata changes on the order of a scan, not of a navigation. Wider than
// ExternalMetadataPlugin.DEFAULT_READ_PROTECTION_WINDOW_MS (3s, "redundant back-to-back reads
// only"), which proved too short in practice.
private const val M3_CACHE_WINDOW_MS = 180_000L

// Cache.network keys are scoped by baseUrl, not by plugin instance: resolvePlugin
// (ExternalMetadataServer) builds a fresh M3Plugin on every resolution, and keying by baseUrl lets
// the single-flight/TTL window survive that recreation.
private fun mangaByIdCacheKey(
    baseUrl: String,
    providerId: String,
    id: String,
) = "m3:manga-by-id:$baseUrl:$providerId:$id"

private fun mangaBySlugCacheKey(
    baseUrl: String,
    slug: String,
) = "m3:manga-by-slug:$baseUrl:$slug"

private fun mangaSearchCacheKey(
    baseUrl: String,
    normalizedTitle: String,
) = "m3:manga-search:$baseUrl:$normalizedTitle"

private val m3Json = Json { ignoreUnknownKeys = true }

/**
 * Translates the raw "M3" (My Mangá Manager — personal BFF) HTTP API (`/api/v1`) into
 * [ExternalMetadataPlugin]'s provider-agnostic shape.
 *
 * A series is resolved in two steps, never by downloading the catalog:
 *  1. `GET /manga/by-id/{providerId}/{id}` — "this exact series on that server". Carries
 *     everything M3 knows, so it is the authoritative path.
 *  2. When M3 has no entry under that pair (404), `GET /mangas?q=<title>` — M3 searches titles and
 *     alternative titles, and the candidate is then opened through `GET /manga/{slug}`.
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
        override val version: String = "1.1.0"

        override val credentialFields: List<CredentialField> = emptyList()

        override val defaultHealthCheckPath: String = "/api/status"

        override val factory = { requestTool: RequestTool, cache: Cache, baseUrl: String, _: String ->
            M3Plugin(baseUrl, requestTool, cache) as ExternalMetadataPlugin
        }
    }

    // One entry of the detail's `external_ids`: the id this series has on ANOTHER service.
    @Serializable
    private data class ExternalIdDto(
        val provider: String,
        @SerialName("external_id") val externalId: String,
    )

    @Serializable
    private data class AlternativeTitleDto(
        val label: String,
        val value: String,
    )

    // The detail route's response (by-id and by-slug answer with the same shape).
    @Serializable
    private data class MangaDetailDto(
        val slug: String? = null,
        val title: String,
        val status: String? = null,
        val abandoned: Boolean = false,
        val summary: String? = null,
        val author: String? = null,
        val genres: List<String> = emptyList(),
        @SerialName("alternative_title_items") val alternativeTitles: List<AlternativeTitleDto> = emptyList(),
        // Everything M3 has for the series, including what the provider has not delivered yet.
        @SerialName("chapter_count") val chapterCount: Int? = null,
        // What the provider delivers and M3 accepts — null while it has not been computed.
        @SerialName("accepted_chapter_count") val acceptedChapterCount: Int? = null,
        @SerialName("last_chapter_name") val lastChapterName: String? = null,
        @SerialName("external_ids") val externalIds: List<ExternalIdDto> = emptyList(),
    )

    // Only what the title search needs from a card: which series, and what it is called.
    @Serializable
    private data class SearchItemDto(
        val slug: String,
        val title: String,
    )

    @Serializable
    private data class SearchResponseDto(
        val items: List<SearchItemDto> = emptyList(),
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
    // entries. Each series is resolved on its own (there is no catalog to download and match
    // locally), a few at a time.
    override suspend fun fetchMatches(series: List<ExternalMetadataSeriesRef>): List<ExternalMetadataMatch?> {
        val permits = Semaphore(FETCH_MATCHES_CONCURRENCY)
        return coroutineScope {
            series.map { ref -> async { permits.withPermit { fetchMatch(ref) } } }.awaitAll()
        }
    }

    // A 404 from the by-id route is "not indexed under this id", not "no such series" — which is
    // why it must not short-circuit to null: the title search still finds a series M3 knows but
    // never recorded this content-provider id for.
    override suspend fun fetchMatch(series: ExternalMetadataSeriesRef): ExternalMetadataMatch? {
        // A blank providerId is what the bridge sends before any content group is resolved: there
        // is no pair to ask the by-id route about, so go straight to the title.
        val byId = if (series.providerId.isBlank()) null else fetchMangaById(series)
        val detail = byId?.let { withFullDetail(it) } ?: findByTitle(series.name)
        return detail?.toExternalMetadataMatch(series.id)
    }

    // The by-id route answers with the series' card (identity and counts), not the full record:
    // summary, author, alternative titles and external ids only exist on /manga/{slug}. So the id
    // resolves WHICH series, and its slug fetches everything. If the full record is unavailable
    // the card is still a valid, thinner answer — better than dropping a series M3 did identify.
    private suspend fun withFullDetail(card: MangaDetailDto): MangaDetailDto = card.slug?.let { fetchMangaBySlug(it) } ?: card

    // null means "M3 has no entry under this (providerId, id)" — a real answer (HTTP 404), not a
    // failure. Any other non-200 is a genuine failure and throws.
    private suspend fun fetchMangaById(series: ExternalMetadataSeriesRef): MangaDetailDto? =
        cache.network.run(
            mangaByIdCacheKey(baseUrl, series.providerId, series.id),
            ttlMs = M3_CACHE_WINDOW_MS,
        ) {
            get(path = "$API_V1/manga/by-id/${series.providerId.pathSegment()}/${series.id.pathSegment()}", allow404 = true)
                ?.let { m3Json.decodeFromString<MangaDetailDto>(it) }
        }

    private suspend fun fetchMangaBySlug(slug: String): MangaDetailDto? =
        cache.network.run(mangaBySlugCacheKey(baseUrl, slug), ttlMs = M3_CACHE_WINDOW_MS) {
            get(path = "$API_V1/manga/${slug.pathSegment()}", allow404 = true)
                ?.let { m3Json.decodeFromString<MangaDetailDto>(it) }
        }

    private suspend fun search(title: String): List<SearchItemDto> =
        cache.network.run(mangaSearchCacheKey(baseUrl, title.normalizedForMatch()), ttlMs = M3_CACHE_WINDOW_MS) {
            val query = URLEncoder.encode(title, "UTF-8")
            val body = get(path = "$API_V1/mangas?q=$query&limit=$SEARCH_LIMIT", allow404 = false)
            m3Json.decodeFromString<SearchResponseDto>(body.orEmpty()).items
        }

    // Title fallback. M3's `q` also looks in alternative titles, so a hit is not necessarily a
    // title match — the three outcomes, in order:
    //  1. Exactly one card whose title equals [name] (normalized) → that one.
    //  2. Several cards with that exact title → ambiguous, null (never a guess).
    //  3. No card title matches → open the first few candidates and keep the one whose
    //     alternative titles contain [name]; more or fewer than one → null.
    private suspend fun findByTitle(name: String): MangaDetailDto? {
        if (name.isBlank()) return null
        val wanted = name.normalizedForMatch()
        val items = search(name)

        val exact = items.filter { it.title.normalizedForMatch() == wanted }
        if (exact.isNotEmpty()) return exact.singleOrNull()?.let { fetchMangaBySlug(it.slug) }

        val byAlternative =
            items
                .take(ALTERNATIVE_TITLE_CANDIDATES)
                .mapNotNull { fetchMangaBySlug(it.slug) }
                .filter { detail -> detail.alternativeTitles.any { it.value.normalizedForMatch() == wanted } }
        return byAlternative.singleOrNull()
    }

    // The body of a 200, or null for a 404 when [allow404]. Any other outcome throws.
    private suspend fun get(
        path: String,
        allow404: Boolean,
    ): String? {
        val http =
            requestTool
                .request(url = "$baseUrl$path", method = "GET")
                .getOrElse { throw M3PluginException("M3 fetch failed: ${it.message}") }

        if (allow404 && http.status == 404) return null
        if (http.status != 200) throw M3PluginException("M3 fetch failed: HTTP ${http.status}")
        return http.body
    }

    private fun MangaDetailDto.toExternalMetadataMatch(seriesId: String) =
        ExternalMetadataMatch(
            seriesId = seriesId,
            slug = slug,
            status = status ?: "unknown",
            downloadedChapters = chapterCount,
            totalChapters = acceptedChapterCount,
            latestChapterLabel = lastChapterName,
            // M3's v1 exposes no per-series error flag. Stays false until it does — it is the
            // "no information" value, not a claim that the series is healthy.
            hasErrors = false,
            abandoned = abandoned,
            summary = summary,
            author = author,
            genres = genres,
            alternativeTitles = alternativeTitles.map { ExternalMetadataAlternativeTitle(label = it.label, value = it.value) },
            externalIds = externalIds.takeIf { it.isNotEmpty() }?.toExternalIds(),
        )

    private fun List<ExternalIdDto>.toExternalIds(): ExternalMetadataExternalIds {
        fun idOf(provider: String) = firstOrNull { it.provider == provider }?.externalId?.toIntOrNull()
        return ExternalMetadataExternalIds(
            malId = idOf("mal"),
            anilistId = idOf("anilist"),
            nexusId = idOf("nexus"),
            onyxreaderId = idOf("onyxreader"),
        )
    }
}

// A value placed in a URL path segment: ids and slugs come from outside, so they never go in raw.
// URLEncoder targets form encoding, where a space is '+'; in a path segment it must be %20.
private fun String.pathSegment(): String = URLEncoder.encode(this, "UTF-8").replace("+", "%20")

private fun String.normalizedForMatch(): String =
    Normalizer
        .normalize(this, Normalizer.Form.NFD)
        .replace(Regex("\\p{Mn}+"), "")
        .lowercase()
        .replace(Regex("[.,;:!?'\"()\\[\\]{}]"), "")
        .replace(Regex("\\s+"), " ")
        .trim()
