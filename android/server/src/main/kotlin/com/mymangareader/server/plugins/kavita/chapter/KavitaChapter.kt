package com.mymangareader.server.plugins.kavita.chapter

import com.mymangareader.server.plugins.kavita.series.KavitaGenreDto
import com.mymangareader.server.plugins.kavita.series.KavitaTagDto
import com.mymangareader.server.plugins.kavita.kavitaRaiseIfSessionRejected
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
private const val CHAPTER_COVER_PATH = "/api/Image/chapter-cover"

private val chapterJson = Json { ignoreUnknownKeys = true }

// Minimal shape for Kavita's real PersonDto (12 fields) — this app only ever reads id/name from
// any of the 12 person-role lists below (writers, coverArtists, ...), so the rest of PersonDto's
// fields aren't declared here yet. Add them if a future contract field actually needs them.
@Serializable
data class KavitaPersonDto(
    val id: Int = 0,
    val name: String? = null,
)

// Minimal shape for Kavita's real MangaFileDto — same rationale as KavitaPersonDto above.
@Serializable
data class KavitaMangaFileDto(
    val id: Int = 0,
    val filePath: String? = null,
)

// Full raw shape of Kavita's real ChapterDto (schemas.md) — every field the API actually returns
// is declared here, even ones no ChapterContract field reads yet (this DTO is a faithful mirror
// of the API response; deciding what's USED happens one layer up, in KavitaServerPlugin/PluginChapter).
@Serializable
data class KavitaChapterDto(
    val id: Int,
    val range: String? = null,
    val number: String? = null,
    val minNumber: Double = 0.0,
    val maxNumber: Double = 0.0,
    val sortOrder: Double = 0.0,
    val pages: Int = 0,
    val isSpecial: Boolean = false,
    val title: String = "",
    val files: List<KavitaMangaFileDto> = emptyList(),
    val pagesRead: Int = 0,
    val totalReads: Int = 0,
    val lastReadingProgressUtc: String? = null,
    val lastReadingProgress: String? = null,
    val coverImageLocked: Boolean = false,
    val volumeId: Int = 0,
    val createdUtc: String? = null,
    val lastModifiedUtc: String? = null,
    val created: String? = null,
    val releaseDate: String? = null,
    val titleName: String? = null,
    val summary: String? = null,
    val ageRating: Int = 0,
    val wordCount: Long = 0,
    val volumeTitle: String? = null,
    val minHoursToRead: Int = 0,
    val maxHoursToRead: Int = 0,
    val avgHoursToRead: Double = 0.0,
    val webLinks: String? = null,
    val isbn: String? = null,
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
    val genres: List<KavitaGenreDto> = emptyList(),
    val tags: List<KavitaTagDto> = emptyList(),
    val publicationStatus: Int = 0,
    val language: String? = null,
    val count: Int = 0,
    val totalCount: Int = 0,
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
    val releaseDateLocked: Boolean = false,
    val titleNameLocked: Boolean = false,
    val sortOrderLocked: Boolean = false,
    val coverImage: String? = null,
    val primaryColor: String? = null,
    val secondaryColor: String? = null,
    val format: Int = 0,
    val aniListId: Int = 0,
    val malId: Long = 0,
    val hardcoverId: Int = 0,
    val metronId: Long = 0,
    val comicVineId: String? = null,
    val mangaBakaId: Int = 0,
    val cbrId: Int = 0,
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
        kavitaRaiseIfSessionRejected(http.status, "Volumes fetch failed")

        if (http.status != 200) throw KavitaChapterException("Volumes fetch failed: HTTP ${http.status}")
        return chapterJson.decodeFromString(http.body)
    }

    fun buildPageUrls(chapterId: String, expectedPageCount: Int): List<String> =
        (0 until expectedPageCount).map { pageIndex -> buildPageUrl(chapterId, pageIndex) }

    fun buildPageUrl(chapterId: String, pageIndex: Int): String =
        "${baseUrl.trimEnd('/')}$PAGE_IMAGE_PATH?chapterId=$chapterId&page=$pageIndex&apiKey=$apiKey"

    fun buildChapterCoverUrl(chapterId: String): String =
        "${baseUrl.trimEnd('/')}$CHAPTER_COVER_PATH?chapterId=$chapterId&apiKey=$apiKey"

    // Kavita already extracts/caches every page while indexing the library, so this returns page
    // pixel dimensions as JSON without downloading any image bytes.
    suspend fun getPageDimensions(chapterId: String): List<KavitaPageDimensionDto> {
        val http = requestTool.request(
            url = "$baseUrl$CHAPTER_INFO_PATH?chapterId=$chapterId&includeDimensions=true",
            method = "GET",
            headers = mapOf("Authorization" to "Bearer $jwt"),
        ).getOrThrow()
        kavitaRaiseIfSessionRejected(http.status, "Chapter info fetch failed")

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
        kavitaRaiseIfSessionRejected(http.status, "Get progress failed")

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
        kavitaRaiseIfSessionRejected(http.status, "Save progress failed")

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
        kavitaRaiseIfSessionRejected(http.status, "Mark chapters failed")

        if (http.status != 200) throw KavitaChapterException("Mark chapters failed: HTTP ${http.status}")
    }
}
