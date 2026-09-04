package com.mymangareader.server.plugins.kavita.series

import com.mymangareader.server.plugins.kavita.chapter.KavitaPersonDto
import com.mymangareader.server.plugins.kavita.kavitaRaiseIfSessionRejected
import com.mymangareader.tools.network.RequestTool
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

private const val SERIES_ALL_PATH = "/api/Series/all-v2"
private const val SERIES_ALL_BODY =
    """{"id":0,"statements":[],"combination":1,"sortOptions":{"sortField":1,"isAscending":true},"limitTo":0}"""
private const val SERIES_COVER_PATH = "/api/Image/series-cover"

private val seriesJson = Json { ignoreUnknownKeys = true }

// Full raw shape of Kavita's real SeriesDto (schemas.md) — every field the API actually returns
// is declared here, even ones no SeriesContract field reads yet (this DTO is a faithful mirror of
// the API response; deciding what's USED happens one layer up, in KavitaServerPlugin/PluginSerial
// — same rationale as KavitaChapterDto, Task 019).
@Serializable
data class KavitaSeriesDto(
    val id: Int,
    val name: String? = null,
    val originalName: String? = null,
    val localizedName: String? = null,
    val sortName: String? = null,
    val pages: Int = 0,
    val coverImageLocked: Boolean = false,
    val lastChapterAdded: String? = null,
    val lastChapterAddedUtc: String? = null,
    val userRating: Double = 0.0,
    val hasUserRated: Boolean = false,
    val totalReads: Int = 0,
    val pagesRead: Int = 0,
    val latestReadDate: String? = null,
    val format: Int = 0,
    val created: String? = null,
    val sortNameLocked: Boolean = false,
    val localizedNameLocked: Boolean = false,
    val nameLocked: Boolean = false,
    val wordCount: Long = 0,
    val libraryId: Int = 0,
    val libraryName: String? = null,
    val minHoursToRead: Int = 0,
    val maxHoursToRead: Int = 0,
    val avgHoursToRead: Double = 0.0,
    val folderPath: String? = null,
    val lowestFolderPath: String? = null,
    val lastFolderScanned: String? = null,
    val dontMatch: Boolean = false,
    val isBlacklisted: Boolean = false,
    val isStandAlone: Boolean = false,
    val metadataProviderOverride: Int = 0,
    val coverImage: String? = null,
    val primaryColor: String? = null,
    val secondaryColor: String? = null,
    val aniListId: Int = 0,
    val malId: Long = 0,
    val hardcoverId: Int = 0,
    val metronId: Long = 0,
    val comicVineId: String? = null,
    val mangaBakaId: Int = 0,
    val mangaBakaEditionId: String? = null,
    val cbrId: Int = 0,
)

@Serializable
data class KavitaGenreDto(
    val id: Int,
    val title: String,
)

@Serializable
data class KavitaTagDto(
    val id: Int,
    val title: String,
)

// Full raw shape of Kavita's real SeriesMetadataDto (schemas.md) — same rationale as
// KavitaSeriesDto above. genres/tags reuse the same KavitaGenreDto/KavitaTagDto as ChapterDto's
// own genres/tags (confirmed same real schema types, GenreTagDto/TagDto); the 12 person-role
// lists reuse KavitaPersonDto (already minimal, see chapter/KavitaChapter.kt).
@Serializable
data class KavitaSeriesMetadataDto(
    val id: Int = 0,
    val summary: String? = null,
    val genres: List<KavitaGenreDto> = emptyList(),
    val tags: List<KavitaTagDto> = emptyList(),
    val writers: List<KavitaPersonDto> = emptyList(),
    val coverArtists: List<KavitaPersonDto> = emptyList(),
    val publishers: List<KavitaPersonDto> = emptyList(),
    val characters: List<KavitaPersonDto> = emptyList(),
    val pencillers: List<KavitaPersonDto> = emptyList(),
    val inkers: List<KavitaPersonDto> = emptyList(),
    val imprints: List<KavitaPersonDto> = emptyList(),
    val colorists: List<KavitaPersonDto> = emptyList(),
    val letterers: List<KavitaPersonDto> = emptyList(),
    val editors: List<KavitaPersonDto> = emptyList(),
    val translators: List<KavitaPersonDto> = emptyList(),
    val teams: List<KavitaPersonDto> = emptyList(),
    val locations: List<KavitaPersonDto> = emptyList(),
    val ageRating: Int = 0,
    val releaseYear: Int = 0,
    val language: String? = null,
    val maxCount: Int = 0,
    val totalCount: Int = 0,
    val publicationStatus: Int = 0,
    val webLinks: String? = null,
    val languageLocked: Boolean = false,
    val summaryLocked: Boolean = false,
    val ageRatingLocked: Boolean = false,
    val publicationStatusLocked: Boolean = false,
    val genresLocked: Boolean = false,
    val tagsLocked: Boolean = false,
    val writerLocked: Boolean = false,
    val characterLocked: Boolean = false,
    val coloristLocked: Boolean = false,
    val editorLocked: Boolean = false,
    val inkerLocked: Boolean = false,
    val imprintLocked: Boolean = false,
    val lettererLocked: Boolean = false,
    val pencillerLocked: Boolean = false,
    val publisherLocked: Boolean = false,
    val translatorLocked: Boolean = false,
    val teamLocked: Boolean = false,
    val locationLocked: Boolean = false,
    val coverArtistLocked: Boolean = false,
    val releaseYearLocked: Boolean = false,
    val seriesId: Int = 0,
)

class KavitaSeriesException(
    message: String,
) : Exception(message)

/** Throws on failure instead of returning [Result] — see [KavitaAuthException]'s class doc for the rationale. */
class KavitaSeries(
    private val baseUrl: String,
    private val jwt: String,
    private val apiKey: String,
    private val requestTool: RequestTool,
) {
    suspend fun listSeries(): List<KavitaSeriesDto> {
        val http =
            requestTool
                .request(
                    url = "$baseUrl$SERIES_ALL_PATH",
                    method = "POST",
                    headers =
                        mapOf(
                            "Content-Type" to "application/json",
                            "Authorization" to "Bearer $jwt",
                        ),
                    body = SERIES_ALL_BODY,
                ).getOrThrow()
        kavitaRaiseIfSessionRejected(http.status, "Series list failed")
        if (http.status != 200) throw KavitaSeriesException("Series list failed: HTTP ${http.status}")
        return seriesJson.decodeFromString(http.body)
    }

    suspend fun getSeries(seriesId: String): KavitaSeriesDto {
        val http =
            requestTool
                .request(
                    url = "$baseUrl/api/Series/$seriesId",
                    method = "GET",
                    headers = mapOf("Authorization" to "Bearer $jwt"),
                ).getOrThrow()
        kavitaRaiseIfSessionRejected(http.status, "Series detail failed")
        if (http.status != 200) throw KavitaSeriesException("Series detail failed: HTTP ${http.status}")
        return seriesJson.decodeFromString(http.body)
    }

    suspend fun getSeriesMetadata(seriesId: String): KavitaSeriesMetadataDto {
        val http =
            requestTool
                .request(
                    url = "$baseUrl/api/Series/metadata?seriesId=$seriesId",
                    method = "GET",
                    headers = mapOf("Authorization" to "Bearer $jwt"),
                ).getOrThrow()
        kavitaRaiseIfSessionRejected(http.status, "Series metadata failed")
        if (http.status != 200) throw KavitaSeriesException("Series metadata failed: HTTP ${http.status}")
        return seriesJson.decodeFromString(http.body)
    }

    fun buildSeriesCoverUrl(seriesId: String): String = "${baseUrl.trimEnd('/')}$SERIES_COVER_PATH?seriesId=$seriesId&apiKey=$apiKey"
}
