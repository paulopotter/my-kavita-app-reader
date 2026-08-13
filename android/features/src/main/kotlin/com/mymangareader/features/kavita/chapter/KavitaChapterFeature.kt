package com.mymangareader.features.kavita.chapter

import com.mymangareader.core.database.AuthConfigDao
import com.mymangareader.core.database.ChapterCacheDao
import com.mymangareader.core.database.ChapterCacheEntity
import com.mymangareader.core.database.PageCacheDao
import com.mymangareader.core.database.PageCacheEntity
import com.mymangareader.core.database.ReadingProgressDao
import com.mymangareader.core.database.ReadingProgressEntity
import com.mymangareader.features.kavita.KavitaUrlSource
import com.mymangareader.tools.network.RequestTool
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

private const val VOLUMES_PATH = "/api/Series/volumes"
private const val MARK_MULTIPLE_READ_PATH = "/api/Reader/mark-multiple-read"
private const val MARK_MULTIPLE_UNREAD_PATH = "/api/Reader/mark-multiple-unread"
private const val GET_PROGRESS_PATH = "/api/Reader/get-progress"
private const val PAGE_IMAGE_PATH = "/api/reader/image"

private val chapterJson = Json { ignoreUnknownKeys = true }

data class LocalProgress(val page: Int, val scrollFraction: Float)

@Singleton
class KavitaChapterFeature @Inject constructor(
    private val urlSource: KavitaUrlSource,
    private val requestTool: RequestTool,
    private val authConfigDao: AuthConfigDao,
    private val chapterCacheDao: ChapterCacheDao,
    private val readingProgressDao: ReadingProgressDao,
    private val pageCacheDao: PageCacheDao,
) {
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

    @Serializable
    private data class ProgressDto(
        val pageNum: Int = 0,
    )

    suspend fun listChaptersForSeries(seriesId: String): Result<List<ChapterCacheEntity>> {
        val auth = authConfigDao.get()
            ?: return Result.failure(IllegalStateException("Not authenticated"))
        val jwt = auth.jwt
            ?: return Result.failure(IllegalStateException("Not authenticated"))

        val baseUrl = urlSource.getActiveUrl().getOrElse { return Result.failure(it) }

        return requestTool.request(
            url = "$baseUrl$VOLUMES_PATH?seriesId=$seriesId",
            method = "GET",
            headers = mapOf("Authorization" to "Bearer $jwt"),
        ).mapCatching { http ->
            if (http.status != 200) error("Volumes fetch failed: HTTP ${http.status}")
            val volumes = chapterJson.decodeFromString<List<VolumeDto>>(http.body)
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

    suspend fun getPageUrls(chapterId: String, expectedPageCount: Int): Result<List<String>> {
        val cached = pageCacheDao.getByChapterId(chapterId)
        if (cached.size == expectedPageCount && expectedPageCount > 0) {
            return Result.success(cached.map { it.url })
        }
        val auth = authConfigDao.get() ?: return Result.failure(IllegalStateException("Not authenticated"))
        val baseUrl = urlSource.getActiveUrl().getOrElse { return Result.failure(it) }
        val urls = (0 until expectedPageCount).map { pageIndex ->
            "${baseUrl.trimEnd('/')}$PAGE_IMAGE_PATH?chapterId=$chapterId&page=$pageIndex&apiKey=${auth.apiKey}"
        }
        val now = System.currentTimeMillis()
        pageCacheDao.replaceForChapter(chapterId, urls.mapIndexed { i, url -> PageCacheEntity(chapterId, i, url, now) })
        return Result.success(urls)
    }

    suspend fun invalidatePageCache(chapterId: String): Result<Unit> =
        runCatching { pageCacheDao.deleteByChapterId(chapterId) }

    suspend fun getPageCacheUrls(chapterId: String): Result<List<Pair<Int, String>>> =
        runCatching { pageCacheDao.getByChapterId(chapterId).map { it.pageIndex to it.url } }

    suspend fun getServerReadProgress(chapterId: String): Result<Int?> {
        val auth = authConfigDao.get() ?: return Result.failure(IllegalStateException("Not authenticated"))
        val jwt = auth.jwt ?: return Result.failure(IllegalStateException("Not authenticated"))
        val baseUrl = urlSource.getActiveUrl().getOrElse { return Result.failure(it) }

        return requestTool.request(
            url = "$baseUrl$GET_PROGRESS_PATH?chapterId=$chapterId",
            method = "GET",
            headers = mapOf("Authorization" to "Bearer $jwt"),
        ).mapCatching { http ->
            if (http.status == 404) return@mapCatching null
            if (http.status != 200) error("Get progress failed: HTTP ${http.status}")
            val dto = chapterJson.decodeFromString<ProgressDto>(http.body)
            dto.pageNum
        }
    }

    suspend fun getLocalProgress(chapterId: String): Result<LocalProgress?> =
        runCatching {
            readingProgressDao.get(chapterId)?.let { LocalProgress(it.page, it.scrollFraction) }
        }

    suspend fun saveLocalProgress(chapterId: String, seriesId: String, page: Int, scrollFraction: Float): Result<Unit> =
        runCatching {
            readingProgressDao.upsert(
                ReadingProgressEntity(
                    chapterId = chapterId,
                    seriesId = seriesId,
                    page = page,
                    updatedAtLocalMs = System.currentTimeMillis(),
                    scrollFraction = scrollFraction,
                ),
            )
        }

    suspend fun markChaptersRead(seriesId: String, chapterIds: List<String>): Result<Unit> =
        markChapters(seriesId, chapterIds, MARK_MULTIPLE_READ_PATH, readStatus = "READ")

    suspend fun markChaptersUnread(seriesId: String, chapterIds: List<String>): Result<Unit> =
        markChapters(seriesId, chapterIds, MARK_MULTIPLE_UNREAD_PATH, readStatus = "UNREAD")

    private suspend fun markChapters(
        seriesId: String,
        chapterIds: List<String>,
        path: String,
        readStatus: String,
    ): Result<Unit> {
        val auth = authConfigDao.get()
            ?: return Result.failure(IllegalStateException("Not authenticated"))
        val jwt = auth.jwt
            ?: return Result.failure(IllegalStateException("Not authenticated"))

        val baseUrl = urlSource.getActiveUrl().getOrElse { return Result.failure(it) }
        val chapterIdsJson = chapterIds.joinToString(",")
        val body = """{"seriesId":$seriesId,"volumeIds":[],"chapterIds":[$chapterIdsJson],"generateReadingSession":false}"""

        return requestTool.request(
            url = "$baseUrl$path",
            method = "POST",
            headers = mapOf(
                "Content-Type" to "application/json",
                "Authorization" to "Bearer $jwt",
            ),
            body = body,
        ).mapCatching { http ->
            if (http.status != 200) error("Mark chapters failed: HTTP ${http.status}")
            val now = System.currentTimeMillis()
            val pagesById = chapterCacheDao.getBySeriesId(seriesId).associate { it.id to it.pageCount }
            chapterIds.forEach { chapterId ->
                chapterCacheDao.updateReadStatus(
                    chapterId = chapterId,
                    readStatus = readStatus,
                    pagesRead = if (readStatus == "READ") pagesById[chapterId] ?: 0 else 0,
                    updatedAtLocalMs = now,
                )
            }
        }
    }
}
