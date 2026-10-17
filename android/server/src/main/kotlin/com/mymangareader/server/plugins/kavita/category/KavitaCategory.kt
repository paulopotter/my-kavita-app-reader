package com.mymangareader.server.plugins.kavita.category

import com.mymangareader.server.plugins.kavita.kavitaRaiseIfSessionRejected
import com.mymangareader.server.plugins.kavita.series.KavitaGenreDto
import com.mymangareader.server.plugins.kavita.series.KavitaSeriesDto
import com.mymangareader.server.plugins.kavita.series.KavitaTagDto
import com.mymangareader.tools.network.RequestTool
import kotlinx.serialization.json.Json

private const val GENRES_PATH = "/api/Metadata/genres"
private const val TAGS_PATH = "/api/Metadata/tags"
private const val SERIES_ALL_PATH = "/api/Series/all-v2"

// Kavita's SeriesFilterField / FilterComparison / FilterCombination numeric values (openapi.json).
// Genres and Tags are filtered by their numeric id, comma-separated: a name here is an HTTP 500.
private const val FIELD_TAGS = 6
private const val FIELD_GENRES = 18
private const val COMPARISON_CONTAINS = 5
private const val COMBINATION_OR = 0

private val categoryJson = Json { ignoreUnknownKeys = true }

class KavitaCategoryException(
    message: String,
) : Exception(message)

/** Throws on failure instead of returning [Result] — see [KavitaAuthException]'s class doc for the rationale. */
class KavitaCategory(
    private val baseUrl: String,
    private val jwt: String,
    private val requestTool: RequestTool,
) {
    suspend fun listGenres(): List<KavitaGenreDto> = get(GENRES_PATH, "Genres list")

    suspend fun listTags(): List<KavitaTagDto> = get(TAGS_PATH, "Tags list")

    // Series carrying ANY of the given genre/tag ids (a series matching several is returned once).
    // Both id spaces are separate in Kavita, hence two statements OR-ed together; an empty side is
    // simply not sent.
    suspend fun listSeriesByCategoryIds(
        genreIds: List<Int>,
        tagIds: List<Int>,
    ): List<KavitaSeriesDto> {
        val statements =
            buildList {
                if (genreIds.isNotEmpty()) add(statement(FIELD_GENRES, genreIds))
                if (tagIds.isNotEmpty()) add(statement(FIELD_TAGS, tagIds))
            }
        if (statements.isEmpty()) return emptyList()

        val body =
            """{"id":0,"statements":[${statements.joinToString(",")}],"combination":$COMBINATION_OR,""" +
                """"sortOptions":{"sortField":1,"isAscending":true},"limitTo":0}"""
        val http =
            requestTool
                .request(
                    url = "$baseUrl$SERIES_ALL_PATH",
                    method = "POST",
                    headers = mapOf("Content-Type" to "application/json", "Authorization" to "Bearer $jwt"),
                    body = body,
                ).getOrThrow()
        kavitaRaiseIfSessionRejected(http.status, "Series by category failed")
        if (http.status != 200) throw KavitaCategoryException("Series by category failed: HTTP ${http.status}")
        return categoryJson.decodeFromString(http.body)
    }

    private fun statement(
        field: Int,
        ids: List<Int>,
    ) = """{"comparison":$COMPARISON_CONTAINS,"field":$field,"value":"${ids.joinToString(",")}"}"""

    private suspend inline fun <reified T> get(
        path: String,
        what: String,
    ): T {
        val http =
            requestTool
                .request(
                    url = "$baseUrl$path",
                    method = "GET",
                    headers = mapOf("Authorization" to "Bearer $jwt"),
                ).getOrThrow()
        kavitaRaiseIfSessionRejected(http.status, "$what failed")
        if (http.status != 200) throw KavitaCategoryException("$what failed: HTTP ${http.status}")
        return categoryJson.decodeFromString(http.body)
    }
}
