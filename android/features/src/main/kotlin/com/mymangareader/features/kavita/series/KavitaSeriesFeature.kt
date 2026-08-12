package com.mymangareader.features.kavita.series

import com.mymangareader.core.database.AuthConfigDao
import com.mymangareader.core.database.BffMatchDao
import com.mymangareader.core.database.ChapterCacheDao
import com.mymangareader.core.database.ChapterCacheEntity
import com.mymangareader.features.kavita.KavitaUrlSource
import com.mymangareader.tools.network.RequestTool
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

private const val SERIES_ALL_PATH = "/api/Series/all-v2"
private const val SERIES_ALL_BODY =
    """{"id":0,"statements":[],"combination":1,"sortOptions":{"sortField":1,"isAscending":true},"limitTo":0}"""

private val seriesJson = Json { ignoreUnknownKeys = true }

data class SeriesSummary(
    val id: Int,
    val name: String,
    val coverUrl: String,
    val readStatus: String,
    val progressFraction: Float,
    val pagesRead: Int,
    val totalPages: Int,
    val lastChapterAddedUtc: String?,
    val downloadedChapters: Int?,
    val totalChapters: Int?,
    val latestChapterLabel: String?,
    val publicationStatus: String,
    val hasErrors: Boolean,
)

data class SeriesDetail(
    val id: String,
    val name: String,
    val coverImageUrl: String,
)

data class SeriesMetadata(
    val summary: String?,
    val genres: List<String>,
    val tags: List<String>,
)

@Singleton
class KavitaSeriesFeature @Inject constructor(
    private val urlSource: KavitaUrlSource,
    private val requestTool: RequestTool,
    private val authConfigDao: AuthConfigDao,
    private val chapterCacheDao: ChapterCacheDao,
    private val bffMatchDao: BffMatchDao,
) {
    @Serializable
    private data class SeriesDto(
        val id: Int,
        val name: String,
        val pagesRead: Int = 0,
        val pages: Int = 0,
        val lastChapterAddedUtc: String? = null,
    )

    @Serializable
    private data class SeriesDetailDto(
        val id: Int,
        val name: String,
    )

    @Serializable
    private data class SeriesMetadataDto(
        val seriesId: Int,
        val summary: String? = null,
        val genres: List<GenreDto> = emptyList(),
        val tags: List<TagDto> = emptyList(),
    )

    @Serializable
    private data class GenreDto(val id: Int, val title: String)

    @Serializable
    private data class TagDto(val id: Int, val title: String)

    suspend fun listSeries(): Result<List<SeriesSummary>> {
        val auth = authConfigDao.get()
            ?: return Result.failure(IllegalStateException("Not authenticated"))
        val jwt = auth.jwt
            ?: return Result.failure(IllegalStateException("Not authenticated"))
        val apiKey = auth.apiKey

        val baseUrl = urlSource.getActiveUrl().getOrElse { return Result.failure(it) }

        return requestTool.request(
            url = "$baseUrl$SERIES_ALL_PATH",
            method = "POST",
            headers = mapOf(
                "Content-Type" to "application/json",
                "Authorization" to "Bearer $jwt",
            ),
            body = SERIES_ALL_BODY,
        ).mapCatching { http ->
            if (http.status != 200) error("Series list failed: HTTP ${http.status}")
            val dtos = seriesJson.decodeFromString<List<SeriesDto>>(http.body)
            dtos.map { dto ->
                val localChapters = chapterCacheDao.getBySeriesId(dto.id.toString())
                val bffMatch = bffMatchDao.getBySeriesId(dto.id.toString())
                SeriesSummary(
                    id = dto.id,
                    name = dto.name,
                    coverUrl = buildCoverUrl(baseUrl, apiKey, dto.id),
                    readStatus = deriveReadStatus(dto.pagesRead, dto.pages),
                    progressFraction = resolveProgress(localChapters, dto.pagesRead, dto.pages),
                    pagesRead = dto.pagesRead,
                    totalPages = dto.pages,
                    lastChapterAddedUtc = dto.lastChapterAddedUtc,
                    downloadedChapters = bffMatch?.downloadedChapters,
                    totalChapters = bffMatch?.totalChapters,
                    latestChapterLabel = bffMatch?.latestChapterLabel,
                    publicationStatus = bffMatch?.status?.toPublicationStatus() ?: "NONE",
                    hasErrors = bffMatch?.hasErrors ?: false,
                )
            }
        }
    }

    suspend fun getSeriesDetail(seriesId: String): Result<SeriesDetail> {
        val auth = authConfigDao.get()
            ?: return Result.failure(IllegalStateException("Not authenticated"))
        val jwt = auth.jwt
            ?: return Result.failure(IllegalStateException("Not authenticated"))
        val apiKey = auth.apiKey

        val baseUrl = urlSource.getActiveUrl().getOrElse { return Result.failure(it) }

        return requestTool.request(
            url = "$baseUrl/api/Series/$seriesId",
            method = "GET",
            headers = mapOf("Authorization" to "Bearer $jwt"),
        ).mapCatching { http ->
            if (http.status != 200) error("Series detail failed: HTTP ${http.status}")
            val dto = seriesJson.decodeFromString<SeriesDetailDto>(http.body)
            SeriesDetail(
                id = dto.id.toString(),
                name = dto.name,
                coverImageUrl = buildCoverUrl(baseUrl, apiKey, dto.id),
            )
        }
    }

    suspend fun getSeriesMetadata(seriesId: String): Result<SeriesMetadata> {
        val auth = authConfigDao.get()
            ?: return Result.failure(IllegalStateException("Not authenticated"))
        val jwt = auth.jwt
            ?: return Result.failure(IllegalStateException("Not authenticated"))

        val baseUrl = urlSource.getActiveUrl().getOrElse { return Result.failure(it) }

        return requestTool.request(
            url = "$baseUrl/api/Series/metadata?seriesId=$seriesId",
            method = "GET",
            headers = mapOf("Authorization" to "Bearer $jwt"),
        ).mapCatching { http ->
            if (http.status != 200) error("Series metadata failed: HTTP ${http.status}")
            val dto = seriesJson.decodeFromString<SeriesMetadataDto>(http.body)
            SeriesMetadata(
                summary = dto.summary,
                genres = dto.genres.map { it.title },
                tags = dto.tags.map { it.title },
            )
        }
    }

    private fun buildCoverUrl(baseUrl: String, apiKey: String, seriesId: Int): String =
        "${baseUrl.trimEnd('/')}/api/image/series-cover?seriesId=$seriesId&apiKey=$apiKey"

    private fun deriveReadStatus(pagesRead: Int, pages: Int): String = when {
        pagesRead <= 0 -> "UNREAD"
        pagesRead >= pages -> "READ"
        else -> "IN_PROGRESS"
    }

    private fun resolveProgress(
        localChapters: List<ChapterCacheEntity>,
        pagesRead: Int,
        pages: Int,
    ): Float {
        if (localChapters.isNotEmpty()) {
            val readCount = localChapters.count { it.readStatus == "READ" }
            return readCount.toFloat() / localChapters.size
        }
        if (pages <= 0) return 0f
        return (pagesRead.toFloat() / pages).coerceIn(0f, 1f)
    }

    private fun String.toPublicationStatus(): String = when (this) {
        "ongoing" -> "ONGOING"
        "completed", "publishing_finished" -> "COMPLETED"
        "cancelled" -> "CANCELLED"
        "on_hiatus" -> "ON_HIATUS"
        "abandoned" -> "ABANDONED"
        else -> "NONE"
    }
}
