package com.mymangareader.server.plugins.kavita.series

import com.mymangareader.tools.network.RequestTool
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

private const val SERIES_ALL_PATH = "/api/Series/all-v2"
private const val SERIES_ALL_BODY =
    """{"id":0,"statements":[],"combination":1,"sortOptions":{"sortField":1,"isAscending":true},"limitTo":0}"""

private val seriesJson = Json { ignoreUnknownKeys = true }

@Serializable
data class KavitaSeriesDto(
    val id: Int,
    val name: String,
    val originalName: String? = null,
    val localizedName: String? = null,
    val sortName: String? = null,
    val pages: Int = 0,
    val pagesRead: Int = 0,
    val lastChapterAddedUtc: String? = null,
    val lastFolderScanned: String? = null,
    val latestReadDate: String? = null,
    val libraryId: Int = 0,
    val libraryName: String? = null,
    val aniListId: Int = 0,
    val malId: Long = 0,
    val primaryColor: String? = null,
    val secondaryColor: String? = null,
)

@Serializable
data class KavitaGenreDto(val id: Int, val title: String)

@Serializable
data class KavitaTagDto(val id: Int, val title: String)

@Serializable
data class KavitaSeriesMetadataDto(
    val seriesId: Int = 0,
    val summary: String? = null,
    val genres: List<KavitaGenreDto> = emptyList(),
    val tags: List<KavitaTagDto> = emptyList(),
    val publicationStatus: String? = null,
    val ageRating: String? = null,
    val releaseYear: Int = 0,
    val language: String? = null,
)

class KavitaSeriesException(message: String) : Exception(message)

/** Throws on failure instead of returning [Result] — see [KavitaAuthException]'s class doc for the rationale. */
class KavitaSeries(
    private val baseUrl: String,
    private val jwt: String,
    private val requestTool: RequestTool,
) {
    suspend fun listSeries(): List<KavitaSeriesDto> {
        val http = requestTool.request(
            url = "$baseUrl$SERIES_ALL_PATH",
            method = "POST",
            headers = mapOf(
                "Content-Type" to "application/json",
                "Authorization" to "Bearer $jwt",
            ),
            body = SERIES_ALL_BODY,
        ).getOrThrow()
        if (http.status != 200) throw KavitaSeriesException("Series list failed: HTTP ${http.status}")
        return seriesJson.decodeFromString(http.body)
    }

    suspend fun getSeries(seriesId: String): KavitaSeriesDto {
        val http = requestTool.request(
            url = "$baseUrl/api/Series/$seriesId",
            method = "GET",
            headers = mapOf("Authorization" to "Bearer $jwt"),
        ).getOrThrow()
        if (http.status != 200) throw KavitaSeriesException("Series detail failed: HTTP ${http.status}")
        return seriesJson.decodeFromString(http.body)
    }

    suspend fun getSeriesMetadata(seriesId: String): KavitaSeriesMetadataDto {
        val http = requestTool.request(
            url = "$baseUrl/api/Series/metadata?seriesId=$seriesId",
            method = "GET",
            headers = mapOf("Authorization" to "Bearer $jwt"),
        ).getOrThrow()
        if (http.status != 200) throw KavitaSeriesException("Series metadata failed: HTTP ${http.status}")
        return seriesJson.decodeFromString(http.body)
    }
}
