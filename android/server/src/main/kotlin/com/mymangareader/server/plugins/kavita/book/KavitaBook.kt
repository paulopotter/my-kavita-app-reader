package com.mymangareader.server.plugins.kavita.book

import com.mymangareader.server.plugins.kavita.kavitaRaiseIfSessionRejected
import com.mymangareader.tools.network.RequestTool
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

private const val BOOK_PATH = "/api/Book"

private val bookJson = Json { ignoreUnknownKeys = true }

class KavitaBookException(
    message: String,
) : Exception(message)

@Serializable
data class KavitaBookInfoDto(
    val bookTitle: String? = null,
    val chapterTitle: String? = null,
    val pages: Int = 0,
)

@Serializable
data class KavitaBookTocItemDto(
    val title: String? = null,
    val part: String? = null,
    val page: Int = 0,
    val children: List<KavitaBookTocItemDto>? = null,
)

/** Kavita's Book API (under /api/Book) — a chapter read as an EPUB. Throws on failure instead of returning a Result. */
class KavitaBook(
    private val baseUrl: String,
    private val jwt: String,
    private val requestTool: RequestTool,
) {
    suspend fun info(chapterId: String): KavitaBookInfoDto = bookJson.decodeFromString(fetch(chapterId, "book-info", "Book info"))

    suspend fun toc(chapterId: String): List<KavitaBookTocItemDto> = bookJson.decodeFromString(fetch(chapterId, "chapters", "Book chapters"))

    // The page comes back as text/plain — an HTML fragment, returned untouched.
    suspend fun page(
        chapterId: String,
        page: Int,
    ): String = fetch(chapterId, "book-page?page=$page", "Book page")

    private suspend fun fetch(
        chapterId: String,
        endpoint: String,
        what: String,
    ): String {
        // The id goes into the path: only a number is a chapter id, anything else is refused.
        val id = chapterId.toIntOrNull() ?: throw KavitaBookException("$what failed: invalid chapter id")
        val http =
            requestTool
                .request(
                    url = "$baseUrl$BOOK_PATH/$id/$endpoint",
                    method = "GET",
                    headers = mapOf("Authorization" to "Bearer $jwt"),
                ).getOrThrow()
        kavitaRaiseIfSessionRejected(http.status, "$what failed")
        if (http.status != 200) throw KavitaBookException("$what failed: HTTP ${http.status}")
        return http.body
    }
}
