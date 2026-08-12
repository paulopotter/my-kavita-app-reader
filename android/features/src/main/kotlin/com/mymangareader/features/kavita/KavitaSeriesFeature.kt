package com.mymangareader.features.kavita

import com.mymangareader.core.database.AuthConfigDao
import com.mymangareader.core.database.BffMatchDao
import com.mymangareader.core.database.ChapterCacheDao
import com.mymangareader.core.database.ChapterCacheEntity
import com.mymangareader.core.database.ReadingProgressDao
import com.mymangareader.core.database.ReadingProgressEntity
import com.mymangareader.tools.network.RequestTool
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

private const val SERIES_ALL_PATH = "/api/Series/all-v2"
private const val SERIES_ALL_BODY =
    """{"id":0,"statements":[],"combination":1,"sortOptions":{"sortField":1,"isAscending":true},"limitTo":0}"""
private const val VOLUMES_PATH_TEMPLATE = "/api/Series/%s/volumes"

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

@Singleton
class KavitaSeriesFeature @Inject constructor(
    private val urlSource: KavitaUrlSource,
    private val requestTool: RequestTool,
    private val authConfigDao: AuthConfigDao,
    private val chapterCacheDao: ChapterCacheDao,
    private val bffMatchDao: BffMatchDao,
    private val readingProgressDao: ReadingProgressDao,
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
    private data class ChapterDto(
        val id: Int,
        val number: String = "",
        val title: String = "",
        val pages: Int = 0,
        val pagesRead: Int = 0,
        val sortOrder: Double = 0.0,
        val createdUtc: String? = null,
    )

    @Serializable
    private data class VolumeDto(
        val id: Int,
        val chapters: List<ChapterDto> = emptyList(),
    )

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

    suspend fun listChaptersForSeries(seriesId: String): Result<List<ChapterCacheEntity>> {
        val auth = authConfigDao.get()
            ?: return Result.failure(IllegalStateException("Not authenticated"))
        val jwt = auth.jwt
            ?: return Result.failure(IllegalStateException("Not authenticated"))

        val baseUrl = urlSource.getActiveUrl().getOrElse { return Result.failure(it) }
        val path = VOLUMES_PATH_TEMPLATE.format(seriesId)

        return requestTool.request(
            url = "$baseUrl$path",
            method = "GET",
            headers = mapOf("Authorization" to "Bearer $jwt"),
        ).mapCatching { http ->
            if (http.status != 200) error("Volumes fetch failed: HTTP ${http.status}")
            val volumes = seriesJson.decodeFromString<List<VolumeDto>>(http.body)
            val existingChapters = chapterCacheDao.getBySeriesId(seriesId)
            val readStatusById = existingChapters.associate { it.id to it.readStatus }
            val pagesReadById = existingChapters.associate { it.id to it.pagesRead }
            volumes.flatMap { volume ->
                volume.chapters.map { ch ->
                    val chId = ch.id.toString()
                    ChapterCacheEntity(
                        id = chId,
                        seriesId = seriesId,
                        title = ch.title,
                        number = ch.number,
                        pageCount = ch.pages,
                        sortOrder = ch.sortOrder,
                        readStatus = readStatusById[chId] ?: if (ch.pagesRead >= ch.pages && ch.pages > 0) "READ" else if (ch.pagesRead > 0) "IN_PROGRESS" else "UNREAD",
                        pagesRead = pagesReadById[chId] ?: ch.pagesRead,
                        updatedAtLocalMs = null,
                    )
                }
            }
        }
    }

    suspend fun saveReadingProgress(chapterId: String, seriesId: String, page: Int): Result<Unit> =
        runCatching {
            val now = System.currentTimeMillis()
            readingProgressDao.upsert(
                ReadingProgressEntity(
                    chapterId = chapterId,
                    seriesId = seriesId,
                    page = page,
                    updatedAtLocalMs = now,
                ),
            )
            chapterCacheDao.updateReadStatus(
                chapterId = chapterId,
                readStatus = "IN_PROGRESS",
                pagesRead = page,
                updatedAtLocalMs = now,
            )
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
