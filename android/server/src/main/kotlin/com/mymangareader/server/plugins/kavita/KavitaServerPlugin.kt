package com.mymangareader.server.plugins.kavita

import com.mymangareader.server.plugins.PluginAgeRating
import com.mymangareader.server.plugins.PluginChapter
import com.mymangareader.server.plugins.PluginGenreOrTag
import com.mymangareader.server.plugins.PluginPageDimension
import com.mymangareader.server.plugins.PluginProgress
import com.mymangareader.server.plugins.CredentialField
import com.mymangareader.server.plugins.PluginSerial
import com.mymangareader.server.plugins.PluginSeriesMetadata
import com.mymangareader.server.plugins.ServerPlugin
import com.mymangareader.server.plugins.ServerPluginRegistration
import com.mymangareader.server.plugins.kavita.auth.KavitaAuth
import com.mymangareader.server.plugins.kavita.chapter.KavitaChapter
import com.mymangareader.server.plugins.kavita.chapter.KavitaChapterDto
import com.mymangareader.server.plugins.kavita.chapter.KavitaVolumeDto
import com.mymangareader.server.plugins.kavita.series.KavitaSeries
import com.mymangareader.server.plugins.kavita.series.KavitaSeriesDto
import com.mymangareader.server.plugins.kavita.series.KavitaSeriesMetadataDto
import com.mymangareader.tools.datetime.ensureIsoUtc
import com.mymangareader.tools.network.RequestTool
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

class KavitaServerPluginException(message: String) : Exception(message)

private val authFormat = Json { ignoreUnknownKeys = true }

/**
 * Translates the raw Kavita plugin (`plugins/kavita/{auth,series,chapter}`) into [ServerPlugin]'s
 * provider-agnostic shape. This class only knows how to map between the two — it never invents
 * business logic of its own beyond what's needed to satisfy the contract (e.g. fetching series
 * detail + metadata in parallel and merging them, since Kavita exposes those as two endpoints
 * but [ServerPlugin.Serial.get] is one call).
 *
 * [apiKey] is required — without it, no Kavita operation is possible at all. [initialJwt] is
 * optional and mutable via [jwt]: if not supplied (or once it goes stale), any operation that
 * needs it authenticates lazily on its own via [ensureToken] and remembers the result — the only
 * piece of state this class holds. Whoever created the plugin can read the current value back
 * via [auth]'s `getToken()`, e.g. to persist it, without needing a network round trip of its own.
 * Both values arrive already decoded from [Info.factory]'s `authJson` — this class itself never
 * touches JSON.
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

    override val id: String = Info.id
    override val displayName: String = Info.displayName
    override val version: String = Info.version

    // authJson's shape: {"credentials": {"apiKey": "..."}, "session": {"jwt": "..."}} — "session"
    // is entirely absent until Server has one to pass along (see Server.resolvePlugin's authJson
    // assembly / mergeAuthJson). Nested under its own key rather than flattened alongside
    // credentials, so a session field can never collide with (and silently overwrite) a
    // credential field of the same name.
    @Serializable
    private data class Credentials(val apiKey: String = "")

    @Serializable
    private data class Session(val jwt: String)

    @Serializable
    private data class AuthPayload(val credentials: Credentials = Credentials(), val session: Session? = null)

    companion object Info : ServerPluginRegistration {
        override val id: String = "kavita"
        override val displayName: String = "Kavita"
        override val version: String = "1.0.0"

        override val credentialFields = listOf(
            CredentialField(
                name = "apiKey",
                label = "Kavita API Key",
                type = "string",
                validate = { value -> if (value.isBlank()) "API key must not be blank" else null },
            ),
        )

        override val defaultHealthCheckPath: String = "/api/Health"

        override val factory = { requestTool: RequestTool, baseUrl: String, authJson: String ->
            val payload = authFormat.decodeFromString<AuthPayload>(authJson)
            KavitaServerPlugin(baseUrl, payload.session?.jwt, payload.credentials.apiKey, requestTool) as ServerPlugin
        }
    }

    private var jwt: String? = initialJwt
    private var refreshToken: String? = null
    private val kavitaAuth = KavitaAuth(baseUrl, requestTool)
    private fun kavitaSeries(token: String) = KavitaSeries(baseUrl, token, apiKey, requestTool)
    private fun kavitaChapter(token: String) = KavitaChapter(baseUrl, token, apiKey, requestTool)

    private suspend fun ensureToken(): String {
        jwt?.let { return it }
        val user = kavitaAuth.authenticate(apiKey)
        jwt = user.token
        refreshToken = user.refreshToken
        return user.token
    }

    override val auth: ServerPlugin.Auth = object : ServerPlugin.Auth {
        override suspend fun authenticate() {
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

        // Kavita's session blob is {"jwt": "..."} — Server stores this opaquely and merges it
        // back under authJson's "session" key the next time it builds this plugin (see
        // Server.mergeAuthJson), never touching "credentials" — so a session value can never
        // clobber the stored apiKey.
        override fun getSession(): String? = jwt?.let { authFormat.encodeToString(Session.serializer(), Session(it)) }
    }

    override val serials: ServerPlugin.Serials = object : ServerPlugin.Serials {
        override suspend fun list(): List<PluginSerial> {
            val api = kavitaSeries(ensureToken())
            return api.listSeries().map { it.toPluginSerial(api.buildSeriesCoverUrl(it.id.toString())) }
        }
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

        override suspend fun get(): PluginSerial {
            val api = kavitaSeries(ensureToken())
            return api.getSeries(serialId).toPluginSerial(api.buildSeriesCoverUrl(serialId))
        }

        override suspend fun getMetadata(): PluginSeriesMetadata =
            kavitaSeries(ensureToken()).getSeriesMetadata(serialId).toPluginSeriesMetadata()

        // Synchronous by design (no network call — this just concatenates a string), same
        // rationale as KavitaPage.getUrl() — safe because buildSeriesCoverUrl only reads apiKey,
        // never the jwt parameter, so an empty one here is inert.
        override fun getCoverUrl(): String = kavitaSeries(token = "").buildSeriesCoverUrl(serialId)

        override val chapters: ServerPlugin.Chapters = object : ServerPlugin.Chapters {
            override suspend fun list(): List<PluginChapter> = volumes().flatMap { it.chapters }.map { it.toPluginChapter() }

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

        // Synchronous by design — same rationale as KavitaPage.getUrl()/KavitaSerial.getCoverUrl().
        override fun getCoverUrl(): String = kavitaChapter(token = "").buildChapterCoverUrl(chapterId)

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

// name is Vital (SeriesContract) — a series with no name isn't a usable result at all, so a
// missing name throws here rather than silently defaulting, letting buildSeriesDigest turn it
// into a SeriesDigest.Failure the same way any other thrown exception does.
private fun KavitaSeriesDto.toPluginSerial(coverUrl: String) = PluginSerial(
    id = id.toString(),
    name = name ?: throw KavitaServerPluginException("Series $id has no name"),
    coverUrl = coverUrl,
    pagesRead = pagesRead,
    totalPages = pages,
    libraryId = if (libraryId != 0) libraryId.toString() else null,
    libraryName = libraryName,
    // Kavita's *Utc values are zone-less with a 7-digit fraction — fix the string FORMAT here
    // (add the Z, clamp the fraction) so the RN side can parse it; the app converts to epoch ms.
    lastFolderScannedUtc = ensureIsoUtc(lastFolderScanned),
    lastChapterAddedUtc = ensureIsoUtc(lastChapterAddedUtc),
    latestReadDateUtc = ensureIsoUtc(latestReadDate),
    originalName = originalName,
    localizedName = localizedName,
    sortName = sortName,
    aniListId = if (aniListId != 0) aniListId else null,
    malId = if (malId != 0L) malId else null,
    primaryColor = primaryColor,
    secondaryColor = secondaryColor,
)

// Kavita's own PublicationStatus enum (0=OnGoing, 1=Hiatus, 2=Completed, 3=Cancelled, 4=Ended) —
// this table is the only place that knowledge lives, same rationale as toPluginFileFormat below.
private fun Int.toPluginPublicationStatus(): String? = when (this) {
    0 -> "OnGoing"
    1 -> "Hiatus"
    2 -> "Completed"
    3 -> "Cancelled"
    4 -> "Ended"
    else -> null
}

// Kavita's own AgeRating enum — its names aren't real ESRB vocabulary (ESRB uses E/E10+/T/M/AO),
// so [system] is "Kavita" here, not a hardcoded "ESRB" — a different provider's adapter would pick
// its own real rating system's name.
private fun Int.toPluginAgeRating(): PluginAgeRating {
    val rating = when (this) {
        0 -> "Unknown"
        1 -> "RatingPending"
        2 -> "EarlyChildhood"
        3 -> "Everyone"
        4 -> "G"
        5 -> "Everyone10Plus"
        6 -> "PG"
        7 -> "KidsToAdults"
        8 -> "Teen"
        9 -> "Mature15Plus"
        10 -> "Mature17Plus"
        11 -> "Mature"
        12 -> "R18Plus"
        13 -> "AdultsOnly"
        14 -> "X18Plus"
        -1 -> "NotApplicable"
        else -> null
    }
    return PluginAgeRating(rating = rating, system = "Kavita")
}

private fun KavitaSeriesMetadataDto.toPluginSeriesMetadata() = PluginSeriesMetadata(
    description = summary,
    genres = genres.map { PluginGenreOrTag(id = it.id.toString(), name = it.title) },
    tags = tags.map { PluginGenreOrTag(id = it.id.toString(), name = it.title) },
    publicationStatus = publicationStatus.toPluginPublicationStatus(),
    ageRating = ageRating.toPluginAgeRating(),
    releaseYear = if (releaseYear != 0) releaseYear else null,
    language = language,
)

// Kavita's own MangaFormat enum (0=Image, 1=Archive, 2=Unknown, 3=Epub, 4=Pdf) — this table is the
// only place that knowledge lives; PluginChapter.fileFormat is free-form text as far as :server
// (Layer 2) is concerned, not a closed enum tied to this provider.
private fun Int.toPluginFileFormat(): String? = when (this) {
    0 -> "image"
    1 -> "archive"
    2 -> "unknown"
    3 -> "epub"
    4 -> "pdf"
    else -> null
}

private fun KavitaChapterDto.toPluginChapter() = PluginChapter(
    id = id.toString(),
    title = title,
    number = number,
    pageCount = pages,
    pagesRead = pagesRead,
    isSpecial = isSpecial,
    decimalNumber = sortOrder,
    specialLabel = range,
    createdUtc = createdUtc,
    lastReadingProgressUtc = lastReadingProgressUtc,
    fileFormat = format.toPluginFileFormat(),
)
