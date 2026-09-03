package com.mymangareader.server

import com.mymangareader.cache.CacheDescriptor
import com.mymangareader.core.database.ServerGroupDao
import com.mymangareader.core.database.ServerGroupEntity
import com.mymangareader.core.database.ServerUrlDao
import com.mymangareader.core.database.ServerUrlEntity
import com.mymangareader.server.plugins.PluginChapter
import com.mymangareader.server.plugins.PluginPageDimension
import com.mymangareader.server.plugins.PluginProgress
import com.mymangareader.server.plugins.PluginSerial
import com.mymangareader.server.plugins.PluginSeriesMetadata
import com.mymangareader.server.plugins.ServerAuthException
import com.mymangareader.server.plugins.ServerPlugin
import com.mymangareader.server.plugins.ServerPluginRegistration
import com.mymangareader.tools.network.RequestTool
import com.mymangareader.tools.network.UrlCandidate
import com.mymangareader.tools.network.UrlProbeResult
import com.mymangareader.tools.network.UrlSelector
import java.io.IOException
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class ServerException(message: String) : Exception(message)

private val authFormat = Json { ignoreUnknownKeys = true }

// Generic — never knows a provider's credential field names ahead of time. Parses
// credentialsJson only as a flat string-to-string object, then runs each of the provider's own
// CredentialField.validate functions against the matching value (blank string if the field is
// entirely absent from the JSON, so a plugin's own "must not be blank" check still catches it).
private fun validateCredentials(registration: ServerPluginRegistration, credentialsJson: String) {
    val parsed = runCatching { authFormat.parseToJsonElement(credentialsJson).jsonObject }
        .getOrElse { throw ServerException("credentialsJson must be a valid JSON object: ${it.message}") }

    for (field in registration.credentialFields) {
        val value = parsed[field.name]?.jsonPrimitive?.content ?: ""
        field.validate(value)?.let { error -> throw ServerException("${field.name}: $error") }
    }
}

// Builds the envelope every ServerPluginRegistration.factory expects:
// {"credentials": <raw credentialsJson object>, "session": <raw sessionJson, or absent>}.
// Server never looks inside sessionJson — it's whatever opaque blob the plugin's own
// getSession() produced last (or null if it never authenticated, or this provider has no
// session concept at all). Only the same plugin class that produced it ever decodes it again.
private fun mergeAuthJson(credentialsJson: String, sessionJson: String?): String {
    val credentials = runCatching { authFormat.parseToJsonElement(credentialsJson).jsonObject }
        .getOrElse { throw ServerException("credentialsJson must be a valid JSON object: ${it.message}") }
    val session = sessionJson?.let {
        runCatching { authFormat.parseToJsonElement(it) }
            .getOrElse { e -> throw ServerException("sessionJson must be valid JSON: ${e.message}") }
    }
    val envelope = buildMap {
        put("credentials", credentials)
        if (session != null) put("session", session)
    }
    return authFormat.encodeToString(JsonObject.serializer(), JsonObject(envelope))
}

// Shared by groups.add/update and Group.addUrl/updateUrl — null means "not provided" (fine,
// update() treats it as "don't change this field"); a non-null blank/invalid value is rejected.
private fun requireNotBlank(fieldName: String, value: String?) {
    if (value?.isBlank() == true) throw ServerException("$fieldName must not be blank")
}

// Shared by groups.add/update — both need the same name/healthCheckPath checks regardless of
// whether the value came from a brand-new group or an update() call's optional parameters.
private fun requireValidGroupFields(name: String?, healthCheckPath: String?) {
    requireNotBlank("name", name)
    requireNotBlank("healthCheckPath", healthCheckPath)
}

private fun requirePositive(fieldName: String, value: Int?) {
    if (value != null && value <= 0) throw ServerException("$fieldName must be positive")
}

private fun requireNotNegative(fieldName: String, value: Int?) {
    if (value != null && value < 0) throw ServerException("$fieldName must not be negative")
}

data class ProviderInfo(
    val id: String,
    val displayName: String,
    val version: String,
    // What this provider needs the user to fill in — mirrors the plugin's CredentialField list,
    // minus the non-serializable `validate` function. `required` is DERIVED from that validate
    // (a field whose validate("") returns an error can't be left blank), so the RN form can put
    // a "*" and block save without hardcoding any provider's field names. The real validation of
    // the entered value still runs server-side in groups.add/update (validateCredentials).
    val credentialFields: List<ProviderCredentialField>,
    // The liveness path this provider answers on — the RN config screen passes it straight into
    // groups.add so it never has to know a provider's endpoint.
    val defaultHealthCheckPath: String,
)

data class ProviderCredentialField(
    val name: String,
    val label: String,
    val type: String,
    val required: Boolean,
)

data class ServerGroupInfo(
    val id: String,
    val name: String,
    val providerId: String,
    val credentialsJson: String,
    val healthCheckPath: String,
)

data class ServerUrlInfo(
    val id: String,
    val groupId: String,
    val url: String,
    val timeoutMs: Int,
    val priority: Int,
)

// group(groupId).getInfo()'s own shape — the group's identity (no credentialsJson/healthCheckPath,
// same omission getActiveInfo() already makes) plus its full list of URLs embedded, for a caller
// that wants "everything about this group" without a separate getUrls() round trip. Distinct from
// ServerActiveInfo (one already-resolved URL) — this is the group's configuration, not a live
// resolution.
data class ServerGroupFullInfo(
    val id: String,
    val name: String,
    val providerId: String,
    val urls: List<ServerUrlInfo>,
)

data class NewServerGroup(
    val name: String,
    val providerId: String,
    val credentialsJson: String,
    val healthCheckPath: String,
)

data class NewServerUrl(
    val url: String,
    val timeoutMs: Int,
    val priority: Int,
)

// ServerGroupInfo + ServerUrlInfo's fields, flattened side by side — deliberately excludes
// credentialsJson (secret) AND healthCheckPath (pure config-time infra detail, not something a
// caller asking "which server answered this" needs). Not a nested { group, activeUrl } shape —
// callers wanting "which server, without secrets" get one flat object, per the user's own call.
@Serializable
data class ServerActiveInfo(
    val groupId: String,
    val groupName: String,
    val providerId: String,
    val urlId: String,
    val url: String,
    val timeoutMs: Int,
    val priority: Int,
)

// Envelope every READ content method (serials.list, serial().get, chapters.list, chapter().get,
// chapter().getProgress, page().getDimensions, page().getUrl) returns — [serverInfo] is never a
// re-resolved "current" value, it's the exact group+URL resolvePlugin used to produce THIS
// [data], captured at the moment of that specific resolution (see buildActiveInfo below) — no
// possible race with a later group/URL switch. Write methods (setRead, setProgress, ...) keep
// returning Unit — there's no "data" to attach provenance to.
data class ServerResponse<T>(
    val data: T,
    val serverInfo: ServerActiveInfo,
    val resolvedAtEpochMs: Long,
)

@Serializable
enum class ImageOrientation { PORTRAIT, LANDSCAPE }

// The one place aspectRatio/orientation/hasFetchedDimensions get computed — every caller that
// resolves an image (Page's url+dimensions, a cover's url) builds its own ImageDescriptor through
// this instead of re-deriving the same formula. Pure — no network, no knowledge of who's calling
// or how many requests it took to gather url/width/height; server/resolvedAtEpochMs/cache are
// passed in because each caller decides those differently (e.g. Page's R11 "last successful call
// wins" logic is the caller's job, not this function's).
@Serializable
data class ImageDescriptor(
    val url: String,
    val hasFetchedDimensions: Boolean,
    val width: Int?,
    val height: Int?,
    val aspectRatio: Double?,
    val orientation: ImageOrientation?,
    val resolvedAtEpochMs: Long,
    val server: ServerActiveInfo,
    val cache: CacheDescriptor?,
)

// Server's normalized shape for one series — the same structure whether it came from
// serial(id).get() (one) or serials.list() (many, wrapped in SerialListData). Mirrors the raw
// PluginSerial the plugin produces, with one difference: the plugin's flat `coverUrl: String`
// becomes a full `coverImage: ImageDescriptor` here, built by Server (which alone knows the
// ServerActiveInfo). This is Server's own "normalize" step — a caller above Server never deals
// with a bare cover URL, and get() vs list() hand back items of exactly the same shape.
@Serializable
data class SerialData(
    val id: String,
    val name: String,
    val coverImage: ImageDescriptor,
    val pagesRead: Int,
    val totalPages: Int,
    val libraryId: String?,
    val libraryName: String?,
    val lastFolderScannedUtc: String?,
    val lastChapterAddedUtc: String?,
    val latestReadDateUtc: String?,
    val originalName: String?,
    val localizedName: String?,
    val sortName: String?,
    val aniListId: Int?,
    val malId: Long?,
    val primaryColor: String?,
    val secondaryColor: String?,
)

// Wrapper for serials.list()'s payload — an object, not a bare array, so list-level metadata
// (total, paging, …) has a place to land later without reshaping the contract.
@Serializable
data class SerialListData(
    val serials: List<SerialData>,
)

// Server's normalize: raw PluginSerial (flat coverUrl string) → SerialData (coverImage
// ImageDescriptor). [server]/[resolvedAtEpochMs] come from the same ServerResponse envelope that
// carried this PluginSerial, so the cover's provenance matches the series' own.
private fun PluginSerial.toSerialData(server: ServerActiveInfo, resolvedAtEpochMs: Long) = SerialData(
    id = id,
    name = name,
    coverImage = buildImageDescriptor(
        url = coverUrl,
        width = null,
        height = null,
        resolvedAtEpochMs = resolvedAtEpochMs,
        server = server,
    ),
    pagesRead = pagesRead,
    totalPages = totalPages,
    libraryId = libraryId,
    libraryName = libraryName,
    lastFolderScannedUtc = lastFolderScannedUtc,
    lastChapterAddedUtc = lastChapterAddedUtc,
    latestReadDateUtc = latestReadDateUtc,
    originalName = originalName,
    localizedName = localizedName,
    sortName = sortName,
    aniListId = aniListId,
    malId = malId,
    primaryColor = primaryColor,
    secondaryColor = secondaryColor,
)

fun buildImageDescriptor(
    url: String,
    width: Int?,
    height: Int?,
    resolvedAtEpochMs: Long,
    server: ServerActiveInfo,
    cache: CacheDescriptor? = null,
): ImageDescriptor {
    val hasFetchedDimensions = width != null && height != null && width > 0 && height > 0
    val aspectRatio = if (hasFetchedDimensions) width!!.toDouble() / height!!.toDouble() else null
    val orientation = when {
        aspectRatio == null || aspectRatio == 1.0 -> null
        aspectRatio > 1.0 -> ImageOrientation.LANDSCAPE
        else -> ImageOrientation.PORTRAIT
    }
    return ImageDescriptor(
        url = url,
        hasFetchedDimensions = hasFetchedDimensions,
        width = width,
        height = height,
        aspectRatio = aspectRatio,
        orientation = orientation,
        resolvedAtEpochMs = resolvedAtEpochMs,
        server = server,
        cache = cache,
    )
}

/**
 * Server only ever imports [ServerPlugin]/[ServerPluginRegistration] — never a concrete plugin
 * like `KavitaServerPlugin` directly. [pluginRegistrations] is the one place that knows every
 * real implementation exists, keyed by `providerId`.
 *
 * "Active group" (which [ServerGroupEntity] content calls resolve against) is a single mutable
 * slot, not per-call state — [activeMutex] serializes every content call and every
 * [setActiveGroup] against each other, so a group switch always waits for in-flight calls to
 * finish first and never interleaves mid-call. Callers who need two servers open at once are
 * expected to hold two separate `Server` instances rather than juggle an id per call.
 */
@Singleton
class Server @Inject constructor(
    private val serverGroupDao: ServerGroupDao,
    private val serverUrlDao: ServerUrlDao,
    private val pluginRegistrations: @JvmSuppressWildcards Map<String, ServerPluginRegistration>,
    private val urlSelector: UrlSelector,
    private val requestTool: RequestTool,
) {
    private val activeMutex = Mutex()
    private var activeGroupId: String? = null

    // Last session blob obtained per group, so a fresh getActiveContent() call doesn't force a
    // new authenticate() call every time — the plugin instance built here already holds it via
    // ServerPlugin.auth.getSession() once it's authenticated (lazily, on first use), and this map
    // is only how Server remembers it across separate getActiveContent() calls. A provider with
    // no session concept simply never has an entry here — that's a normal, permanent state, not
    // a missing one. Guarded by the same activeMutex as everything else touching activeGroupId.
    private val sessionByGroupId = mutableMapOf<String, String>()

    // The ServerActiveInfo resolvePlugin built the last time it ran for this group, for ANY
    // reason (setActiveGroup/reauthenticateActiveGroup authenticating, a content call resolving
    // its plugin, or a withUrlRetry-triggered re-selection) — already fully assembled there
    // (buildActiveInfo), never re-resolved/re-fetched afterward. This always reflects the group+
    // URL Server itself actually used last, never a fresh/independent re-check (that's what
    // group(id).validateUrls() is for). A group with no entry here yet has never been resolved at
    // all in this process — group(id).getActive()/getActive()/getActiveInfo() return null only in
    // that case, never throw. Guarded by the same activeMutex as everything else here.
    private val lastActiveInfoByGroupId = mutableMapOf<String, ServerActiveInfo>()

    val providers: Providers = object : Providers {
        override fun list(): List<ProviderInfo> = pluginRegistrations.values.map { it.toInfo() }
    }

    val groups: Groups = object : Groups {
        override suspend fun list(): List<ServerGroupInfo> = serverGroupDao.getAll().map { it.toInfo() }

        override suspend fun get(groupId: String): ServerGroupInfo? = serverGroupDao.getById(groupId)?.toInfo()

        override suspend fun add(group: NewServerGroup): ServerGroupInfo {
            val registration = pluginRegistrations[group.providerId]
                ?: throw ServerException("Unknown providerId: ${group.providerId}")
            requireValidGroupFields(group.name, group.healthCheckPath)
            validateCredentials(registration, group.credentialsJson)
            val entity = ServerGroupEntity(
                id = UUID.randomUUID().toString(),
                name = group.name,
                providerId = group.providerId,
                credentialsJson = group.credentialsJson,
                healthCheckPath = group.healthCheckPath,
            )
            serverGroupDao.upsert(entity)
            return entity.toInfo()
        }

        override suspend fun update(groupId: String, name: String?, credentialsJson: String?, healthCheckPath: String?): ServerGroupInfo {
            val existing = serverGroupDao.getById(groupId) ?: throw ServerException("Server group not found: $groupId")
            requireValidGroupFields(name, healthCheckPath)
            if (credentialsJson != null) {
                val registration = pluginRegistrations[existing.providerId]
                    ?: throw ServerException("Unknown providerId for group: ${existing.providerId}")
                validateCredentials(registration, credentialsJson)
            }
            val updated = existing.copy(
                name = name ?: existing.name,
                credentialsJson = credentialsJson ?: existing.credentialsJson,
                healthCheckPath = healthCheckPath ?: existing.healthCheckPath,
            )
            serverGroupDao.upsert(updated)
            // The stale session was issued for the old credentials — clear it so the next content
            // call (or setActiveGroup) authenticates fresh instead of silently reusing an
            // invalid session.
            if (credentialsJson != null && credentialsJson != existing.credentialsJson) {
                activeMutex.withLock { sessionByGroupId.remove(groupId) }
            }
            return updated.toInfo()
        }

        override suspend fun remove(groupId: String) {
            serverUrlDao.deleteByGroupId(groupId)
            serverGroupDao.deleteById(groupId)
        }
    }

    fun group(groupId: String): Group = GroupHandle(groupId)

    // Content-consuming mirror of ServerPlugin's own tree (serials/serial/chapters/chapter/
    // pages/page) — auth is deliberately excluded, that's already handled internally via
    // setActiveGroup/reauthenticateActiveGroup. Each call resolves the active group's plugin
    // fresh via getActiveContent() and delegates straight through, wrapped in withUrlRetry so a
    // dead URL (e.g. a LAN IP that stopped answering after a wifi switch) gets replaced
    // transparently instead of failing the call outright.
    val serials: Serials = object : Serials {
        override suspend fun list(): ServerResponse<SerialListData> {
            val response = withUrlRetryEnveloped { it.serials.list() }
            val normalized = response.data.map { it.toSerialData(response.serverInfo, response.resolvedAtEpochMs) }
            return ServerResponse(SerialListData(normalized), response.serverInfo, response.resolvedAtEpochMs)
        }
    }

    fun serial(serialId: String): Serial = SerialHandle(serialId)

    private inner class SerialHandle(private val serialId: String) : Serial {
        override suspend fun get(): ServerResponse<SerialData> {
            val response = withUrlRetryEnveloped { it.serial(serialId).get() }
            return ServerResponse(
                response.data.toSerialData(response.serverInfo, response.resolvedAtEpochMs),
                response.serverInfo,
                response.resolvedAtEpochMs,
            )
        }

        override suspend fun getMetadata(): ServerResponse<PluginSeriesMetadata> =
            withUrlRetryEnveloped { it.serial(serialId).getMetadata() }

        override suspend fun getCoverImage(): ImageDescriptor {
            val response = withUrlRetryEnveloped { it.serial(serialId).getCoverUrl() }
            return buildImageDescriptor(
                url = response.data,
                width = null,
                height = null,
                resolvedAtEpochMs = response.resolvedAtEpochMs,
                server = response.serverInfo,
            )
        }

        override val chapters: Chapters = object : Chapters {
            override suspend fun list(): ServerResponse<List<PluginChapter>> = withUrlRetryEnveloped { it.serial(serialId).chapters.list() }
            override suspend fun setRead(isRead: Boolean, chapterIds: List<String>) =
                withUrlRetry { it.serial(serialId).chapters.setRead(isRead, chapterIds) }
        }

        override fun chapter(chapterId: String): Chapter = ChapterHandle(serialId, chapterId)
    }

    private inner class ChapterHandle(private val serialId: String, private val chapterId: String) : Chapter {
        override suspend fun get(): ServerResponse<PluginChapter> = withUrlRetryEnveloped { it.serial(serialId).chapter(chapterId).get() }
        override suspend fun getCoverImage(): ImageDescriptor {
            val response = withUrlRetryEnveloped { it.serial(serialId).chapter(chapterId).getCoverUrl() }
            return buildImageDescriptor(
                url = response.data,
                width = null,
                height = null,
                resolvedAtEpochMs = response.resolvedAtEpochMs,
                server = response.serverInfo,
            )
        }
        override suspend fun setRead(isRead: Boolean) = withUrlRetry { it.serial(serialId).chapter(chapterId).setRead(isRead) }
        override suspend fun getProgress(): ServerResponse<PluginProgress?> =
            withUrlRetryEnveloped { it.serial(serialId).chapter(chapterId).getProgress() }
        override suspend fun setProgress(pageIndex: Int) = withUrlRetry { it.serial(serialId).chapter(chapterId).setProgress(pageIndex) }

        override fun page(pageIndex: Int): Page = PageHandle(serialId, chapterId, pageIndex)
    }

    private inner class PageHandle(
        private val serialId: String,
        private val chapterId: String,
        private val pageIndex: Int,
    ) : Page {
        override suspend fun getDimensions(): ServerResponse<PluginPageDimension> =
            withUrlRetryEnveloped { it.serial(serialId).chapter(chapterId).page(pageIndex).getDimensions() }

        override suspend fun getUrl(): ServerResponse<String> =
            withUrlRetryEnveloped { it.serial(serialId).chapter(chapterId).page(pageIndex).getUrl() }
    }

    // Runs one content call against the active group's plugin, with two independent one-shot
    // recoveries — each retries the SAME call exactly once against a freshly-built plugin:
    //
    //  - IOException (connection refused, timeout, DNS failure): the picked URL is dead. Force a
    //    fresh URL selection (ignoring the 15-minute cache) and retry. A second IOException is not
    //    retried again — two dead URLs in a row means the group itself is unreachable right now.
    //
    //  - ServerAuthException (an authenticated content call came back 401 — the plugin raises this
    //    specifically for that, see its doc): the URL is fine, the session expired. Re-authenticate
    //    the active group (full login via the stored apiKey — reauthenticateActiveGroup drops the
    //    cached session and calls authenticate()) against the same URL, then retry. A second
    //    ServerAuthException means the credential itself no longer works (revoked apiKey / account
    //    change) — it propagates, and whoever's above sends the user back to setup.
    //
    // The two are handled separately, not nested: a 401 does not trigger a URL reselect, and a
    // network failure does not trigger a re-auth.
    // Used directly by WRITE methods (no data to envelope); READ methods use
    // withUrlRetryEnveloped below instead.
    private suspend fun <T> withUrlRetry(action: suspend (ServerPlugin) -> T): T {
        val groupId = activeGroupId ?: throw ServerException("No active server group set — call setActiveGroup(id) first")
        return try {
            action(getActiveContent())
        } catch (e: ServerAuthException) {
            reauthenticateActiveGroup(groupId)
            action(getActiveContent(groupId = groupId))
        } catch (e: IOException) {
            action(getActiveContent(forceUrlReselect = true, groupId = groupId))
        }
    }

    // Same retry behavior as withUrlRetry, but for READ methods: wraps the result in a
    // ServerResponse using lastActiveInfoByGroupId[activeGroupId] — which resolvePlugin (called
    // internally by getActiveContent, on either the first attempt or the retry) has *always*
    // already written to by the time action() returns successfully, so this is never stale or
    // racing against a later call: it's exactly the group+URL that produced this specific [data].
    private suspend fun <T> withUrlRetryEnveloped(action: suspend (ServerPlugin) -> T): ServerResponse<T> {
        val data = withUrlRetry(action)
        val groupId = activeGroupId ?: throw ServerException("No active server group set — call setActiveGroup(id) first")
        val serverInfo = activeMutex.withLock { lastActiveInfoByGroupId[groupId] }
            ?: throw ServerException("No resolution recorded for group $groupId after a successful content call — this should be unreachable")
        return ServerResponse(data = data, serverInfo = serverInfo, resolvedAtEpochMs = System.currentTimeMillis())
    }

    interface Group {
        suspend fun getUrls(): List<ServerUrlInfo>

        // The group's own identity + getUrls() embedded, in one call. Throws if the group
        // doesn't exist — same "not found" contract as every other Group operation.
        suspend fun getInfo(): ServerGroupFullInfo

        suspend fun addUrl(url: NewServerUrl): ServerUrlInfo
        suspend fun updateUrl(urlId: String, url: String? = null, timeoutMs: Int? = null, priority: Int? = null): ServerUrlInfo
        suspend fun removeUrl(urlId: String)

        // Point check on ONE URL (any string, not necessarily one of this group's configured
        // URLs) — hits `<url><group healthCheckPath>` once and reports the outcome. Unlike
        // validateUrls() this NEVER changes which URL is active and never touches the selector's
        // cache; it's the config screen's "is this address I just typed reachable right now?"
        // button. `timeoutMs` defaults to the same 5s the config screen uses for new URLs.
        suspend fun testUrl(url: String, timeoutMs: Int = 5000): UrlProbeResult

        // Tests every configured URL for this group, highest priority (lowest number) first,
        // and returns the one that actually answered its health check — always a fresh test,
        // ignoring UrlSelector's 15-minute cache, since "validate my server" on the config
        // screen means "check right now," not "trust what I last knew." Throws ServerException
        // if none responded.
        suspend fun validateUrls(): ServerUrlInfo

        // The ServerUrlInfo that actually won selection the last time this group's plugin was
        // resolved for ANY reason (see resolvePlugin) — setActiveGroup/reauthenticateActiveGroup
        // authenticating, or a content call. Never re-runs selection or hits the network itself.
        // null only if this group has never been resolved at all in this process (not an error)
        // — this is the key difference from validateUrls(), which always re-checks live. Only
        // the URL fields — for the group's own identity too, see Server.getActiveInfo().
        suspend fun getActive(): ServerUrlInfo?
    }

    // Selects the active group. Same "ensure a session" shape used inside KavitaServerPlugin's
    // own ensureToken(): if this group already has a session on file (e.g. re-selecting the
    // group that was already active, or one authenticated before), reuse it and skip the network
    // round trip entirely — only a genuinely new group (or one whose session was cleared)
    // authenticates. A provider whose authenticate() leaves getSession() at null (no session
    // concept at all) is a normal outcome, not an error — nothing here requires a non-null
    // result. Switching URLs within the same group never touches this at all; that's resolved
    // silently inside resolvePlugin/getActiveContent every call, no re-auth involved either way.
    // Waits for any in-flight content call to finish first, and blocks any other call from
    // starting until this switch completes — never a partial/interleaved switch.
    suspend fun setActiveGroup(groupId: String) = activeMutex.withLock {
        if (sessionByGroupId[groupId] == null) {
            val plugin = resolvePlugin(groupId, sessionJson = null)
            plugin.auth.authenticate()
            plugin.auth.getSession()?.let { sessionByGroupId[groupId] = it }
        }
        activeGroupId = groupId
    }

    // Forces re-authentication for a group even if a session is already on file — e.g. after the
    // user changes that group's credentials, or the server rejects the current session (401) and
    // a fresh login is needed. Everything else behaves like setActiveGroup.
    suspend fun reauthenticateActiveGroup(groupId: String) = activeMutex.withLock {
        sessionByGroupId.remove(groupId)
        val plugin = resolvePlugin(groupId, sessionJson = null)
        plugin.auth.authenticate()
        plugin.auth.getSession()?.let { sessionByGroupId[groupId] = it }
        activeGroupId = groupId
    }

    fun getActiveGroupId(): String? = activeGroupId

    // Resolves the active group's healthy URL and builds a live ServerPlugin for it, reusing the
    // session setActiveGroup obtained instead of authenticating again. Held under the same
    // activeMutex as setActiveGroup — a group switch can never happen mid-resolution.
    // forceUrlReselect/groupId are only ever passed by withUrlRetry, after a network failure —
    // normal callers always use the no-arg form, which reads the current activeGroupId itself.
    suspend fun getActiveContent(
        forceUrlReselect: Boolean = false,
        groupId: String? = null,
    ): ServerPlugin = activeMutex.withLock {
        val resolvedGroupId = groupId ?: activeGroupId
            ?: throw ServerException("No active server group set — call setActiveGroup(id) first")
        resolvePlugin(resolvedGroupId, sessionJson = sessionByGroupId[resolvedGroupId], forceUrlReselect = forceUrlReselect)
    }

    // authJson is assembled here, never persisted as-is — it merges the group's stored
    // credentialsJson with whatever session blob Server currently holds in memory for this
    // group, per ServerPluginRegistration.factory's contract. Server never looks inside
    // sessionJson; a provider with no session concept simply never has one to pass along.
    private suspend fun resolvePlugin(groupId: String, sessionJson: String?, forceUrlReselect: Boolean = false): ServerPlugin {
        val group = serverGroupDao.getById(groupId) ?: throw ServerException("Server group not found: $groupId")
        val registration = pluginRegistrations[group.providerId]
            ?: throw ServerException("Unknown providerId for group: ${group.providerId}")

        val candidates = urlCandidatesFor(groupId, group.healthCheckPath)
        val selection = if (forceUrlReselect) urlSelector.invalidateAndReselect(candidates) else urlSelector.getActiveUrl(candidates)
        val activeUrl = selection.getOrElse {
            throw ServerException("Could not resolve a healthy URL for group $groupId: ${it.message}")
        }

        // Same string→entity reconciliation as Group.validateUrls() — UrlSelector only returns
        // the winning URL string, not which ServerUrlEntity it came from, so it's looked up here
        // by matching the trimmed URL. The resulting ServerActiveInfo is built right here, from
        // the exact group+url this resolution just used, and recorded so group(id).getActive()/
        // getActive()/getActiveInfo() — and every ServerResponse a content call returns — reflect
        // precisely this resolution, never a later re-check.
        serverUrlDao.getByGroupId(groupId).firstOrNull { it.url.trimEnd('/') == activeUrl }?.let {
            lastActiveInfoByGroupId[groupId] = buildActiveInfo(group, it)
        }

        val authJson = mergeAuthJson(group.credentialsJson, sessionJson)
        return registration.factory(requestTool, activeUrl, authJson)
    }

    // Pure assembly — never resolves/fetches anything itself, just flattens the two rows it's
    // given into the shape ServerActiveInfo promises (no credentialsJson/healthCheckPath).
    // Shared by resolvePlugin (which already has both rows from the resolution it just ran) and
    // getActiveInfo (which resolves them itself, for a caller with no in-flight content call).
    private fun buildActiveInfo(group: ServerGroupEntity, url: ServerUrlEntity) = ServerActiveInfo(
        groupId = group.id,
        groupName = group.name,
        providerId = group.providerId,
        urlId = url.id,
        url = url.url,
        timeoutMs = url.timeoutMs,
        priority = url.priority,
    )

    private suspend fun urlCandidatesFor(groupId: String, healthCheckPath: String): List<UrlCandidate> {
        val urls = serverUrlDao.getByGroupId(groupId)
        if (urls.isEmpty()) throw ServerException("Server group has no URLs configured: $groupId")
        return urls.map { it.toUrlCandidate(healthCheckPath) }
    }

    interface Providers {
        fun list(): List<ProviderInfo>
    }

    interface Groups {
        suspend fun list(): List<ServerGroupInfo>
        suspend fun get(groupId: String): ServerGroupInfo?
        suspend fun add(group: NewServerGroup): ServerGroupInfo
        suspend fun update(groupId: String, name: String? = null, credentialsJson: String? = null, healthCheckPath: String? = null): ServerGroupInfo
        suspend fun remove(groupId: String)
    }

    interface Serials {
        suspend fun list(): ServerResponse<SerialListData>
    }

    interface Serial {
        suspend fun get(): ServerResponse<SerialData>
        suspend fun getMetadata(): ServerResponse<PluginSeriesMetadata>
        suspend fun getCoverImage(): ImageDescriptor
        val chapters: Chapters
        fun chapter(chapterId: String): Chapter
    }

    interface Chapters {
        suspend fun list(): ServerResponse<List<PluginChapter>>
        suspend fun setRead(isRead: Boolean, chapterIds: List<String>)
    }

    interface Chapter {
        suspend fun get(): ServerResponse<PluginChapter>
        suspend fun getCoverImage(): ImageDescriptor
        suspend fun setRead(isRead: Boolean)
        suspend fun getProgress(): ServerResponse<PluginProgress?>
        suspend fun setProgress(pageIndex: Int)
        fun page(pageIndex: Int): Page
    }

    interface Page {
        suspend fun getDimensions(): ServerResponse<PluginPageDimension>
        suspend fun getUrl(): ServerResponse<String>
    }

    private inner class GroupHandle(private val groupId: String) : Group {
        override suspend fun getUrls(): List<ServerUrlInfo> = serverUrlDao.getByGroupId(groupId).map { it.toInfo() }

        override suspend fun getInfo(): ServerGroupFullInfo {
            val group = serverGroupDao.getById(groupId) ?: throw ServerException("Server group not found: $groupId")
            return ServerGroupFullInfo(
                id = group.id,
                name = group.name,
                providerId = group.providerId,
                urls = getUrls(),
            )
        }

        override suspend fun addUrl(url: NewServerUrl): ServerUrlInfo {
            serverGroupDao.getById(groupId) ?: throw ServerException("Server group not found: $groupId")
            requireNotBlank("url", url.url)
            requirePositive("timeoutMs", url.timeoutMs)
            requireNotNegative("priority", url.priority)
            val entity = ServerUrlEntity(
                id = UUID.randomUUID().toString(),
                groupId = groupId,
                url = url.url,
                timeoutMs = url.timeoutMs,
                priority = url.priority,
            )
            serverUrlDao.upsert(entity)
            return entity.toInfo()
        }

        override suspend fun updateUrl(urlId: String, url: String?, timeoutMs: Int?, priority: Int?): ServerUrlInfo {
            val existing = serverUrlDao.getById(urlId)?.takeIf { it.groupId == groupId }
                ?: throw ServerException("Server url not found: $urlId in group $groupId")
            requireNotBlank("url", url)
            requirePositive("timeoutMs", timeoutMs)
            requireNotNegative("priority", priority)
            val updated = existing.copy(
                url = url ?: existing.url,
                timeoutMs = timeoutMs ?: existing.timeoutMs,
                priority = priority ?: existing.priority,
            )
            serverUrlDao.upsert(updated)
            return updated.toInfo()
        }

        override suspend fun removeUrl(urlId: String) {
            val existing = serverUrlDao.getById(urlId)?.takeIf { it.groupId == groupId }
                ?: throw ServerException("Server url not found: $urlId in group $groupId")
            serverUrlDao.deleteById(existing.id)
        }

        override suspend fun testUrl(url: String, timeoutMs: Int): UrlProbeResult {
            val group = serverGroupDao.getById(groupId) ?: throw ServerException("Server group not found: $groupId")
            requireNotBlank("url", url)
            requirePositive("timeoutMs", timeoutMs)
            return urlSelector.probe(
                UrlCandidate(
                    id = "probe",
                    url = url,
                    timeoutMs = timeoutMs,
                    priority = 0,
                    healthCheckPath = group.healthCheckPath,
                ),
            )
        }

        override suspend fun validateUrls(): ServerUrlInfo {
            val group = serverGroupDao.getById(groupId) ?: throw ServerException("Server group not found: $groupId")
            val candidates = urlCandidatesFor(groupId, group.healthCheckPath)
            val winningUrl = urlSelector.invalidateAndReselect(candidates).getOrElse {
                throw ServerException("Could not resolve a healthy URL for group $groupId: ${it.message}")
            }
            return serverUrlDao.getByGroupId(groupId).first { it.url.trimEnd('/') == winningUrl }.toInfo()
        }

        override suspend fun getActive(): ServerUrlInfo? = activeMutex.withLock {
            lastActiveInfoByGroupId[groupId]?.let {
                ServerUrlInfo(id = it.urlId, groupId = it.groupId, url = it.url, timeoutMs = it.timeoutMs, priority = it.priority)
            }
        }
    }

    // Same data as group(groupId).getActive(), but for whichever group is currently selected via
    // setActiveGroup — no groupId needed. null when no group is active at all; once a group has
    // been made active, setActiveGroup's own resolvePlugin call already recorded an entry, so
    // this is only null before the very first setActiveGroup call of this process.
    suspend fun getActive(): ServerUrlInfo? {
        val groupId = activeGroupId ?: return null
        return group(groupId).getActive()
    }

    // Group + active URL, flattened, credentialsJson/healthCheckPath left out — the "which
    // server answered this, safe to expose" shape a Layer 3 domain contract (e.g. PageDigest's
    // ServerDescriptor, Task 018+) can use as-is. Reads the already-assembled ServerActiveInfo
    // resolvePlugin last recorded for the active group — never re-resolves anything itself. null
    // when no group is active at all, or that group has never been resolved yet in this process
    // (same conditions as getActive()).
    suspend fun getActiveInfo(): ServerActiveInfo? {
        val groupId = activeGroupId ?: return null
        return activeMutex.withLock { lastActiveInfoByGroupId[groupId] }
    }

    // Same "which group is active" resolution as getActiveInfo(), but returns the active group's
    // full configuration (getInfo()'s shape — every URL, not just the one last resolved) instead
    // of a single already-resolved URL. Coexists with getActiveInfo(); neither replaces the other.
    suspend fun getActiveGroupInfo(): ServerGroupFullInfo? {
        val groupId = activeGroupId ?: return null
        return group(groupId).getInfo()
    }
}

private fun ServerPluginRegistration.toInfo() = ProviderInfo(
    id = id,
    displayName = displayName,
    version = version,
    credentialFields = credentialFields.map {
        ProviderCredentialField(
            name = it.name,
            label = it.label,
            type = it.type,
            // "required" = the field's own validate rejects an empty value.
            required = it.validate("") != null,
        )
    },
    defaultHealthCheckPath = defaultHealthCheckPath,
)

private fun ServerGroupEntity.toInfo() = ServerGroupInfo(
    id = id,
    name = name,
    providerId = providerId,
    credentialsJson = credentialsJson,
    healthCheckPath = healthCheckPath,
)

private fun ServerUrlEntity.toInfo() = ServerUrlInfo(
    id = id,
    groupId = groupId,
    url = url,
    timeoutMs = timeoutMs,
    priority = priority,
)

private fun ServerUrlEntity.toUrlCandidate(healthCheckPath: String) = UrlCandidate(
    id = id,
    url = url,
    timeoutMs = timeoutMs,
    priority = priority,
    healthCheckPath = healthCheckPath,
)
