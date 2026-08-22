package com.mymangareader.server.plugins.kavita.chapter

import com.mymangareader.tools.network.RequestTool
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

private const val VOLUMES_PATH = "/api/Series/volumes"
private const val MARK_MULTIPLE_READ_PATH = "/api/Reader/mark-multiple-read"
private const val MARK_MULTIPLE_UNREAD_PATH = "/api/Reader/mark-multiple-unread"
private const val GET_PROGRESS_PATH = "/api/Reader/get-progress"
private const val SAVE_PROGRESS_PATH = "/api/Reader/progress"
private const val PAGE_IMAGE_PATH = "/api/reader/image"
private const val CHAPTER_INFO_PATH = "/api/Reader/chapter-info"

private val chapterJson = Json { ignoreUnknownKeys = true }

@Serializable
data class KavitaChapterDto(
    val id: Int,
    val range: String? = null,
    val number: String? = null,
    val sortOrder: Double = 0.0,
    val pages: Int = 0,
    val isSpecial: Boolean = false,
    val title: String = "",
    val pagesRead: Int = 0,
    val lastReadingProgressUtc: String? = null,
    val volumeId: Int = 0,
    val createdUtc: String? = null,
)

@Serializable
data class KavitaVolumeDto(
    val id: Int,
    val seriesId: Int = 0,
    val chapters: List<KavitaChapterDto> = emptyList(),
)

@Serializable
data class KavitaProgressDto(
    val volumeId: Int = 0,
    val chapterId: Int = 0,
    val pageNum: Int = 0,
    val seriesId: Int = 0,
    val libraryId: Int = 0,
    val bookScrollId: String? = null,
    val lastModifiedUtc: String? = null,
)

@Serializable
data class KavitaPageDimensionDto(
    val width: Int = 0,
    val height: Int = 0,
    val pageNumber: Int = 0,
)

@Serializable
data class KavitaChapterInfoDto(
    val pageDimensions: List<KavitaPageDimensionDto> = emptyList(),
)

class KavitaChapterException(message: String) : Exception(message)

/** Throws on failure instead of returning [Result] — see [com.mymangareader.server.plugins.kavita.auth.KavitaAuthException]'s class doc for the rationale. */
class KavitaChapter(
    private val baseUrl: String,
    private val jwt: String,
    private val apiKey: String,
    private val requestTool: RequestTool,
) {
    suspend fun listVolumesForSeries(seriesId: String): List<KavitaVolumeDto> {
        val http = requestTool.request(
            url = "$baseUrl$VOLUMES_PATH?seriesId=$seriesId",
            method = "GET",
            headers = mapOf("Authorization" to "Bearer $jwt"),
        ).getOrThrow()
        if (http.status != 200) throw KavitaChapterException("Volumes fetch failed: HTTP ${http.status}")
        return chapterJson.decodeFromString(http.body)
    }

    fun buildPageUrls(chapterId: String, expectedPageCount: Int): List<String> =
        (0 until expectedPageCount).map { pageIndex -> buildPageUrl(chapterId, pageIndex) }

    fun buildPageUrl(chapterId: String, pageIndex: Int): String =
        "${baseUrl.trimEnd('/')}$PAGE_IMAGE_PATH?chapterId=$chapterId&page=$pageIndex&apiKey=$apiKey"

    // Kavita already extracts/caches every page while indexing the library, so this returns page
    // pixel dimensions as JSON without downloading any image bytes.
    suspend fun getPageDimensions(chapterId: String): List<KavitaPageDimensionDto> {
        val http = requestTool.request(
            url = "$baseUrl$CHAPTER_INFO_PATH?chapterId=$chapterId&includeDimensions=true",
            method = "GET",
            headers = mapOf("Authorization" to "Bearer $jwt"),
        ).getOrThrow()
        if (http.status != 200) throw KavitaChapterException("Chapter info fetch failed: HTTP ${http.status}")
        return chapterJson.decodeFromString<KavitaChapterInfoDto>(http.body).pageDimensions.sortedBy { it.pageNumber }
    }

    suspend fun getProgress(chapterId: String): KavitaProgressDto? {
        val http = requestTool.request(
            url = "$baseUrl$GET_PROGRESS_PATH?chapterId=$chapterId",
            method = "GET",
            headers = mapOf("Authorization" to "Bearer $jwt"),
        ).getOrThrow()
        if (http.status == 404) return null
        if (http.status != 200) throw KavitaChapterException("Get progress failed: HTTP ${http.status}")
        return chapterJson.decodeFromString(http.body)
    }

    // Kavita's save-progress endpoint requires volumeId, which isn't known up front — this looks
    // it up via the series' volume listing first, same source listVolumesForSeries already uses.
    suspend fun saveProgress(seriesId: String, chapterId: String, pageIndex: Int) {
        val volumeId = listVolumesForSeries(seriesId)
            .flatMap { volume -> volume.chapters.map { volume.id to it.id } }
            .firstOrNull { (_, chId) -> chId.toString() == chapterId }
            ?.first
            ?: throw KavitaChapterException("Chapter $chapterId not found in series $seriesId")

        val body = """{"volumeId":$volumeId,"chapterId":$chapterId,"pageNum":$pageIndex,"seriesId":$seriesId}"""

        val http = requestTool.request(
            url = "$baseUrl$SAVE_PROGRESS_PATH",
            method = "POST",
            headers = mapOf(
                "Content-Type" to "application/json",
                "Authorization" to "Bearer $jwt",
            ),
            body = body,
        ).getOrThrow()
        if (http.status != 200) throw KavitaChapterException("Save progress failed: HTTP ${http.status}")
    }

    suspend fun markChaptersRead(seriesId: String, chapterIds: List<String>) =
        markChapters(seriesId, chapterIds, MARK_MULTIPLE_READ_PATH)

    suspend fun markChaptersUnread(seriesId: String, chapterIds: List<String>) =
        markChapters(seriesId, chapterIds, MARK_MULTIPLE_UNREAD_PATH)

    private suspend fun markChapters(seriesId: String, chapterIds: List<String>, path: String) {
        val chapterIdsJson = chapterIds.joinToString(",")
        val body = """{"seriesId":$seriesId,"volumeIds":[],"chapterIds":[$chapterIdsJson],"generateReadingSession":false}"""

        val http = requestTool.request(
            url = "$baseUrl$path",
            method = "POST",
            headers = mapOf(
                "Content-Type" to "application/json",
                "Authorization" to "Bearer $jwt",
            ),
            body = body,
        ).getOrThrow()
        if (http.status != 200) throw KavitaChapterException("Mark chapters failed: HTTP ${http.status}")
    }
}
