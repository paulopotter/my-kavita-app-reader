package com.mymangareader.features.kavita.series

import com.mymangareader.core.database.AuthConfigDao
import com.mymangareader.core.database.SeriesDetailCacheDao
import com.mymangareader.core.database.SeriesDetailCacheEntity
import com.mymangareader.features.kavita.KavitaUrlSource
import com.mymangareader.tools.network.RequestTool
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

private val seriesJson = Json { ignoreUnknownKeys = true }

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

// Task 028: listSeries()/SeriesSummary/resolveProgress() were removed — the Library screen now
// assembles its list on the RN side from SerialsService (`:server`) + the BFF batch + the
// per-series digest index, never from this feature's chapterCacheDao/bffMatchDao aggregation.
// What's left here (getSeriesDetail/getSeriesMetadata + their SeriesDetailCache) still backs
// SeriesModule's getSeriesDetail bridge method.
@Singleton
class KavitaSeriesFeature @Inject constructor(
    private val urlSource: KavitaUrlSource,
    private val requestTool: RequestTool,
    private val authConfigDao: AuthConfigDao,
    private val seriesDetailCacheDao: SeriesDetailCacheDao,
) {
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
    // abaixo são a leitura pura e imediata que o RN usa para não esperar a rede na primeira pintura.
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
}
