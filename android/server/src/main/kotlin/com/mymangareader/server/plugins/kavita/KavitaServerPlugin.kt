package com.mymangareader.server.plugins.kavita

import com.mymangareader.server.plugins.PluginChapter
import com.mymangareader.server.plugins.PluginPageDimension
import com.mymangareader.server.plugins.PluginProgress
import com.mymangareader.server.plugins.PluginSerial
import com.mymangareader.server.plugins.ServerPlugin
import com.mymangareader.server.plugins.kavita.auth.KavitaAuth
import com.mymangareader.server.plugins.kavita.chapter.KavitaChapter
import com.mymangareader.server.plugins.kavita.chapter.KavitaChapterDto
import com.mymangareader.server.plugins.kavita.chapter.KavitaVolumeDto
import com.mymangareader.server.plugins.kavita.series.KavitaSeries
import com.mymangareader.server.plugins.kavita.series.KavitaSeriesDto
import com.mymangareader.server.plugins.kavita.series.KavitaSeriesMetadataDto
import com.mymangareader.tools.network.RequestTool
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class KavitaServerPluginException(message: String) : Exception(message)

/**
 * Translates the raw Kavita plugin (`plugins/kavita/{auth,series,chapter}`) into [ServerPlugin]'s
 * provider-agnostic shape. This class only knows how to map between the two — it never invents
 * business logic of its own beyond what's needed to satisfy the contract (e.g. fetching series
 * detail + metadata in parallel and merging them, since Kavita exposes those as two endpoints
 * but [ServerPlugin.Serial.get] is one call).
 *
 * [apiKey] is required — without it, no Kavita operation is possible at all. [jwt] is optional
 * and mutable: if not supplied (or once it goes stale), any operation that needs it authenticates
 * lazily on its own via [ensureToken] and remembers the result — the only piece of state this
 * class holds. Whoever created the plugin can read the current value back via [auth]'s
 * `getToken()`, e.g. to persist it, without needing a network round trip of its own.
 *
 * Throws on failure instead of returning [Result], per [ServerPlugin]'s convention for this
 * module.
 */
class KavitaServerPlugin(
    private val baseUrl: String,
    initialJwt: String?,
    private val apiKey: String,
    private val requestTool: RequestTool,
) : ServerPlugin {

    private var jwt: String? = initialJwt
    private var refreshToken: String? = null
    private val kavitaAuth = KavitaAuth(baseUrl, requestTool)
    private fun kavitaSeries(token: String) = KavitaSeries(baseUrl, token, requestTool)
    private fun kavitaChapter(token: String) = KavitaChapter(baseUrl, token, apiKey, requestTool)

    private suspend fun ensureToken(): String {
        jwt?.let { return it }
        val user = kavitaAuth.authenticate(apiKey)
        jwt = user.token
        refreshToken = user.refreshToken
        return user.token
    }

    override val auth: ServerPlugin.Auth = object : ServerPlugin.Auth {
        override suspend fun authenticate(apiKey: String) {
            val user = kavitaAuth.authenticate(apiKey)
            jwt = user.token
            refreshToken = user.refreshToken
        }

        override suspend fun checkToken(): String? =
            kavitaAuth.checkApiKeyExpiry(ensureToken()).expiresAt

        override suspend fun reauthenticate() {
            val currentJwt = jwt ?: throw KavitaServerPluginException("No token to reauthenticate — never authenticated yet")
            val currentRefreshToken = refreshToken
                ?: throw KavitaServerPluginException("No refreshToken available — the initial authenticate() response didn't include one")

            val renewed = kavitaAuth.reauthenticate(currentJwt, currentRefreshToken)
            jwt = renewed.token
            refreshToken = renewed.refreshToken
        }

        override suspend fun logout() {
            kavitaAuth.logout()
            jwt = null
            refreshToken = null
        }

        override fun getToken(): String? = jwt
    }

    override val serials: ServerPlugin.Serials = object : ServerPlugin.Serials {
        override suspend fun list(): List<PluginSerial> =
            kavitaSeries(ensureToken()).listSeries()
                .map { it.toPluginSerial(summary = null, genres = emptyList(), tags = emptyList()) }
    }

    override fun serial(serialId: String): ServerPlugin.Serial = KavitaSerial(serialId)

    // Memoizes listVolumesForSeries within this single Serial instance only — chapters.list()
    // and chapter(id).get() both read from the same source, so calling both on the same Serial
    // (e.g. list then look up one specific chapter) no longer repeats the same request. Scoped
    // to the instance on purpose: a fresh plugin.serial(id) call starts clean, and separate
    // Serial instances never share this field, so there's no cross-series or cross-call race to
    // worry about (same reasoning that ruled out a mutable, shared "current chapter" earlier).
    //
    // Single-flight (per ServerPlugin.DEFAULT_READ_PROTECTION_WINDOW_MS): a Mutex serializes
    // access so two concurrent callers (e.g. list() and get() invoked "at the same time") never
    // both see an empty cache and fire their own request — whichever gets the lock first fetches
    // and stores the result, the other then finds it already fresh once it's their turn. Any
    // write that could affect this data (setRead, setProgress) must call invalidateVolumes() so
    // the next read is never allowed to observe stale data — the window only ever protects
    // against redundant back-to-back reads with nothing in between.
    private inner class KavitaSerial(private val serialId: String) : ServerPlugin.Serial {
        private val volumesMutex = Mutex()
        private var cachedVolumes: List<KavitaVolumeDto>? = null
        private var volumesFetchedAtMs: Long = 0L

        // Not private: KavitaChapterContext (created via chapter(id) below) also reads through
        // this so get()/list() share the same memoized fetch instead of duplicating it.
        suspend fun volumes(): List<KavitaVolumeDto> = volumesMutex.withLock {
            val stillFresh = cachedVolumes != null &&
                System.currentTimeMillis() - volumesFetchedAtMs < ServerPlugin.DEFAULT_READ_PROTECTION_WINDOW_MS
            if (stillFresh) return@withLock cachedVolumes!!

            kavitaChapter(ensureToken()).listVolumesForSeries(serialId).also {
                cachedVolumes = it
                volumesFetchedAtMs = System.currentTimeMillis()
            }
        }

        fun invalidateVolumes() {
            cachedVolumes = null
        }

        override suspend fun get(): PluginSerial = coroutineScope {
            val series = kavitaSeries(ensureToken())

            val seriesDeferred = async { series.getSeries(serialId) }
            val metadataDeferred = async { series.getSeriesMetadata(serialId) }

            val seriesDto = seriesDeferred.await()
            val metadata = metadataDeferred.await()

            seriesDto.toPluginSerial(
                summary = metadata.summary,
                genres = metadata.genres.map { it.title },
                tags = metadata.tags.map { it.title },
            )
        }

        override val chapters: ServerPlugin.Chapters = object : ServerPlugin.Chapters {
            override suspend fun list(): List<PluginChapter> =
                volumes().flatMap { it.chapters }.map { it.toPluginChapter() }

            override suspend fun setRead(isRead: Boolean, chapterIds: List<String>) {
                val chapter = kavitaChapter(ensureToken())
                if (isRead) chapter.markChaptersRead(serialId, chapterIds) else chapter.markChaptersUnread(serialId, chapterIds)
                invalidateVolumes()
            }
        }

        override fun chapter(chapterId: String): ServerPlugin.Chapter = KavitaChapterContext(this, seriesId = serialId, chapterId = chapterId)
    }

    // Kavita has no "get one chapter by id" endpoint — only "list every chapter in a series" —
    // so get() re-fetches that series' chapters and filters, per the earlier plan: "he's going to
    // call the other method and filter." Goes through the owning KavitaSerial's volumes() so it
    // shares that instance's memoization instead of always issuing its own request.
    private inner class KavitaChapterContext(
        private val serial: KavitaSerial,
        private val seriesId: String,
        private val chapterId: String,
    ) : ServerPlugin.Chapter {
        override suspend fun get(): PluginChapter =
            serial.volumes()
                .flatMap { it.chapters }
                .firstOrNull { it.id.toString() == chapterId }
                ?.toPluginChapter()
                ?: throw KavitaServerPluginException("Chapter $chapterId not found in series $seriesId")

        override suspend fun setRead(isRead: Boolean) {
            val chapter = kavitaChapter(ensureToken())
            if (isRead) {
                chapter.markChaptersRead(seriesId, chapterIds = listOf(chapterId))
            } else {
                chapter.markChaptersUnread(seriesId, chapterIds = listOf(chapterId))
            }
            serial.invalidateVolumes()
        }

        override suspend fun getProgress(): PluginProgress? =
            kavitaChapter(ensureToken()).getProgress(chapterId)
                ?.let { PluginProgress(pageIndex = it.pageNum, updatedAtUtc = it.lastModifiedUtc) }

        override suspend fun setProgress(pageIndex: Int) {
            kavitaChapter(ensureToken()).saveProgress(seriesId, chapterId, pageIndex)
            serial.invalidateVolumes()
        }

        override val pages: ServerPlugin.Pages = object : ServerPlugin.Pages {}

        override fun page(pageIndex: Int): ServerPlugin.Page = KavitaPage(chapterId, pageIndex)
    }

    private inner class KavitaPage(private val chapterId: String, private val pageIndex: Int) : ServerPlugin.Page {
        override suspend fun getDimensions(): PluginPageDimension {
            val dto = kavitaChapter(ensureToken()).getPageDimensions(chapterId).getOrNull(pageIndex)
                ?: throw KavitaServerPluginException("No dimension for page $pageIndex")
            return PluginPageDimension(width = dto.width, height = dto.height)
        }

        // Synchronous by design (no network call — this just concatenates a string), so it can't
        // call ensureToken(). Safe because buildPageUrl only reads apiKey (always known, required
        // at construction) — it never touches the jwt parameter, so an empty one here is inert.
        override fun getUrl(): String = kavitaChapter(token = "").buildPageUrl(chapterId, pageIndex)
    }
}

private fun KavitaSeriesDto.toPluginSerial(summary: String?, genres: List<String>, tags: List<String>) = PluginSerial(
    id = id.toString(),
    name = name,
    coverUrl = null,
    pagesRead = pagesRead,
    totalPages = pages,
    lastUpdatedUtc = lastChapterAddedUtc,
    summary = summary,
    genres = genres,
    tags = tags,
)

private fun KavitaChapterDto.toPluginChapter() = PluginChapter(
    id = id.toString(),
    title = title,
    number = number,
    pageCount = pages,
    pagesRead = pagesRead,
    isSpecial = isSpecial,
)
