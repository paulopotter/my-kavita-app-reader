package com.mymangareader.features.kavita.series

import com.mymangareader.core.database.AuthConfigDao
import com.mymangareader.core.database.BffMatchDao
import com.mymangareader.core.database.ChapterCacheDao
import com.mymangareader.core.database.ChapterCacheEntity
import com.mymangareader.core.database.SeriesDetailCacheDao
import com.mymangareader.core.database.SeriesDetailCacheEntity
import com.mymangareader.features.kavita.KavitaUrlSource
import com.mymangareader.tools.network.RequestTool
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
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
    val readChapters: Int?,
    val chapterCount: Int?,
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
    private val seriesDetailCacheDao: SeriesDetailCacheDao,
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
                    readChapters = if (localChapters.isNotEmpty()) localChapters.count { it.readStatus == "READ" } else null,
                    chapterCount = if (localChapters.isNotEmpty()) localChapters.size else null,
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
        }.onSuccess { detail -> cacheSeriesDetail(seriesId, detail) }
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
        }.onSuccess { metadata -> cacheSeriesMetadata(seriesId, metadata) }
    }

    // Cache local para pintura instantânea da tela de detalhe (nome/capa/sinopse/gêneros/tags
    // raramente mudam) — getSeriesDetail/getSeriesMetadata continuam sempre indo à rede (são a
    // fonte de verdade que mantém o cache atualizado); getCachedSeriesDetail/getCachedSeriesMetadata
    // abaixo são a leitura pura e imediata que o RN usa para não esperar a rede na primeira pintura,
    // mesmo padrão cache-then-network já usado por getCachedChapters/replaceCachedChapters.
    private suspend fun cacheSeriesDetail(seriesId: String, detail: SeriesDetail) {
        val existing = seriesDetailCacheDao.get(seriesId)
        seriesDetailCacheDao.upsert(
            SeriesDetailCacheEntity(
                seriesId = seriesId,
                name = detail.name,
                coverImageUrl = detail.coverImageUrl,
                summary = existing?.summary,
                genresJson = existing?.genresJson ?: "[]",
                tagsJson = existing?.tagsJson ?: "[]",
                updatedAtLocalMs = System.currentTimeMillis(),
            ),
        )
    }

    private suspend fun cacheSeriesMetadata(seriesId: String, metadata: SeriesMetadata) {
        val existing = seriesDetailCacheDao.get(seriesId)
        seriesDetailCacheDao.upsert(
            SeriesDetailCacheEntity(
                seriesId = seriesId,
                name = existing?.name ?: "",
                coverImageUrl = existing?.coverImageUrl ?: "",
                summary = metadata.summary,
                genresJson = seriesJson.encodeToString(metadata.genres),
                tagsJson = seriesJson.encodeToString(metadata.tags),
                updatedAtLocalMs = System.currentTimeMillis(),
            ),
        )
    }

    suspend fun getCachedSeriesDetail(seriesId: String): SeriesDetail? {
        val cached = seriesDetailCacheDao.get(seriesId) ?: return null
        if (cached.name.isEmpty()) return null
        return SeriesDetail(id = seriesId, name = cached.name, coverImageUrl = cached.coverImageUrl)
    }

    suspend fun getCachedSeriesMetadata(seriesId: String): SeriesMetadata? {
        val cached = seriesDetailCacheDao.get(seriesId) ?: return null
        return SeriesMetadata(
            summary = cached.summary,
            genres = seriesJson.decodeFromString(cached.genresJson),
            tags = seriesJson.decodeFromString(cached.tagsJson),
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
