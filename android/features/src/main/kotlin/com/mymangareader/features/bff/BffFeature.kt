package com.mymangareader.features.bff

import com.mymangareader.core.database.BffMatchDao
import com.mymangareader.core.database.BffMatchEntity
import com.mymangareader.core.database.BffServerConfigDao
import com.mymangareader.core.database.ServerConfigDao
import com.mymangareader.features.kavita.SeriesSummary
import com.mymangareader.tools.network.RequestTool
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.text.Normalizer
import javax.inject.Inject
import javax.inject.Singleton

private const val BFF_MANGA_PATH = "/manga"
private const val BFF_HEALTH_CHECK_PATH = "/manga"
private const val BFF_TIMEOUT_MS = 3000

private val bffJson = Json { ignoreUnknownKeys = true }

@Singleton
class BffFeature @Inject constructor(
    private val requestTool: RequestTool,
    private val bffServerConfigDao: BffServerConfigDao,
    private val serverConfigDao: ServerConfigDao,
    private val bffMatchDao: BffMatchDao,
) {
    @Serializable
    private data class MangaDto(
        val slug: String? = null,
        val title: String,
        val status: String? = null,
        val abandoned: Boolean = false,
        @SerialName("downloaded_chapters_count") val downloadedChapters: Int? = null,
        @SerialName("known_chapters_total") val totalChapters: Int? = null,
        @SerialName("latest_chapter_number") val latestChapterLabel: String? = null,
        @SerialName("has_errors") val hasErrors: Boolean = false,
        @SerialName("kavita_id") val kavitaId: Int? = null,
    )

    @Volatile private var lastKnownUrl: String? = null

    fun getLastKnownUrl(): String? = lastKnownUrl

    suspend fun testConnection(): Result<String> = runCatching {
        resolveActiveUrl() ?: error("No BFF server available")
    }

    suspend fun syncBff(kavitaSeries: List<SeriesSummary>): Result<Unit> = runCatching {
        val baseUrl = resolveActiveUrl()
            ?: return Result.failure(IllegalStateException("No BFF server available"))

        val http = requestTool.request(
            url = "$baseUrl$BFF_MANGA_PATH",
            method = "GET",
        ).getOrElse { return Result.failure(it) }

        if (http.status != 200) return Result.failure(
            IllegalStateException("BFF fetch failed: HTTP ${http.status}"),
        )

        val mangaDtos = bffJson.decodeFromString<List<MangaDto>>(http.body)

        val byKavitaId = mangaDtos.filter { it.kavitaId != null }
            .associateBy { it.kavitaId!! }
        val byNormalizedName = mangaDtos.associateBy { it.title.normalizedForMatch() }

        val now = System.currentTimeMillis()
        val matches = kavitaSeries.mapNotNull { series ->
            val dto = byKavitaId[series.id] ?: byNormalizedName[series.name.normalizedForMatch()]
            dto?.let {
                BffMatchEntity(
                    seriesId = series.id.toString(),
                    slug = it.slug,
                    status = it.status ?: "unknown",
                    downloadedChapters = it.downloadedChapters,
                    totalChapters = it.totalChapters,
                    latestChapterLabel = it.latestChapterLabel,
                    hasErrors = it.hasErrors,
                    updatedAtLocalMs = now,
                )
            }
        }

        bffMatchDao.replaceAll(matches)
    }

    private suspend fun resolveActiveUrl(): String? {
        val bffCandidates = bffServerConfigDao.getAll()
        if (bffCandidates.isEmpty()) return null

        val kavitaUrlById = serverConfigDao.getAll().associate { it.id to it.url }

        for (candidate in bffCandidates) {
            val url = candidate.url.trimEnd('/')
            val path = candidate.healthCheckPath.ifBlank { BFF_HEALTH_CHECK_PATH }

            val ok = runCatching {
                requestTool.request(
                    url = "$url$path",
                    method = "GET",
                ).getOrNull()?.status == 200
            }.getOrElse { false }

            if (ok) {
                lastKnownUrl = url
                return url
            }
        }

        return null
    }

    private fun String.normalizedForMatch(): String =
        Normalizer.normalize(this, Normalizer.Form.NFD)
            .replace(Regex("\\p{Mn}+"), "")
            .lowercase()
            .replace(Regex("[.,;:!?'\"()\\[\\]{}]"), "")
            .replace(Regex("\\s+"), " ")
            .trim()
}
