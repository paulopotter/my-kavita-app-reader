package com.mymangareader.server

import com.mymangareader.core.database.ServerGroupDao
import com.mymangareader.core.database.ServerGroupEntity
import com.mymangareader.core.database.ServerUrlDao
import com.mymangareader.core.database.ServerUrlEntity
import com.mymangareader.server.plugins.PluginChapter
import com.mymangareader.server.plugins.PluginPageDimension
import com.mymangareader.server.plugins.PluginProgress
import com.mymangareader.server.plugins.PluginSerial
import com.mymangareader.server.plugins.ServerPlugin
import com.mymangareader.server.plugins.ServerPluginRegistration
import com.mymangareader.tools.network.RequestTool
import com.mymangareader.tools.network.UrlCandidate
import com.mymangareader.tools.network.UrlSelector
import java.io.IOException
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
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
        override suspend fun list(): List<PluginSerial> = withUrlRetry { it.serials.list() }
    }

    fun serial(serialId: String): Serial = SerialHandle(serialId)

    private inner class SerialHandle(private val serialId: String) : Serial {
        override suspend fun get(): PluginSerial = withUrlRetry { it.serial(serialId).get() }

        override val chapters: Chapters = object : Chapters {
            override suspend fun list(): List<PluginChapter> = withUrlRetry { it.serial(serialId).chapters.list() }
            override suspend fun setRead(isRead: Boolean, chapterIds: List<String>) =
                withUrlRetry { it.serial(serialId).chapters.setRead(isRead, chapterIds) }
        }

        override fun chapter(chapterId: String): Chapter = ChapterHandle(serialId, chapterId)
    }

    private inner class ChapterHandle(private val serialId: String, private val chapterId: String) : Chapter {
        override suspend fun get(): PluginChapter = withUrlRetry { it.serial(serialId).chapter(chapterId).get() }
        override suspend fun setRead(isRead: Boolean) = withUrlRetry { it.serial(serialId).chapter(chapterId).setRead(isRead) }
        override suspend fun getProgress(): PluginProgress? = withUrlRetry { it.serial(serialId).chapter(chapterId).getProgress() }
        override suspend fun setProgress(pageIndex: Int) = withUrlRetry { it.serial(serialId).chapter(chapterId).setProgress(pageIndex) }

        override fun page(pageIndex: Int): Page = PageHandle(serialId, chapterId, pageIndex)
    }

    private inner class PageHandle(
        private val serialId: String,
        private val chapterId: String,
        private val pageIndex: Int,
    ) : Page {
        override suspend fun getDimensions(): PluginPageDimension =
            withUrlRetry { it.serial(serialId).chapter(chapterId).page(pageIndex).getDimensions() }

        override suspend fun getUrl(): String =
            withUrlRetry { it.serial(serialId).chapter(chapterId).page(pageIndex).getUrl() }
    }

    // Runs one content call against the active group's plugin; if it fails with a network error
    // (IOException — connection refused, timeout, DNS failure; never an HTTP status like 401,
    // which surfaces as a normal return value from RequestTool, not an exception), forces a
    // fresh URL selection (ignoring the 15-minute cache) and retries the same call exactly once
    // against a freshly-built plugin. A second network failure is not retried again — it
    // propagates, since two dead URLs in a row means the group itself is unreachable right now,
    // not that the wrong URL was picked.
    private suspend fun <T> withUrlRetry(action: suspend (ServerPlugin) -> T): T {
        val groupId = activeGroupId ?: throw ServerException("No active server group set — call setActiveGroup(id) first")
        return try {
            action(getActiveContent())
        } catch (e: IOException) {
            action(getActiveContent(forceUrlReselect = true, groupId = groupId))
        }
    }

    interface Group {
        suspend fun getUrls(): List<ServerUrlInfo>
        suspend fun addUrl(url: NewServerUrl): ServerUrlInfo
        suspend fun updateUrl(urlId: String, url: String? = null, timeoutMs: Int? = null, priority: Int? = null): ServerUrlInfo
        suspend fun removeUrl(urlId: String)

        // Tests every configured URL for this group, highest priority (lowest number) first,
        // and returns the one that actually answered its health check — always a fresh test,
        // ignoring UrlSelector's 15-minute cache, since "validate my server" on the config
        // screen means "check right now," not "trust what I last knew." Throws ServerException
        // if none responded.
        suspend fun validateUrls(): ServerUrlInfo
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

        val authJson = mergeAuthJson(group.credentialsJson, sessionJson)
        return registration.factory(requestTool, activeUrl, authJson)
    }

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
        suspend fun list(): List<PluginSerial>
    }

    interface Serial {
        suspend fun get(): PluginSerial
        val chapters: Chapters
        fun chapter(chapterId: String): Chapter
    }

    interface Chapters {
        suspend fun list(): List<PluginChapter>
        suspend fun setRead(isRead: Boolean, chapterIds: List<String>)
    }

    interface Chapter {
        suspend fun get(): PluginChapter
        suspend fun setRead(isRead: Boolean)
        suspend fun getProgress(): PluginProgress?
        suspend fun setProgress(pageIndex: Int)
        fun page(pageIndex: Int): Page
    }

    interface Page {
        suspend fun getDimensions(): PluginPageDimension
        suspend fun getUrl(): String
    }

    private inner class GroupHandle(private val groupId: String) : Group {
        override suspend fun getUrls(): List<ServerUrlInfo> = serverUrlDao.getByGroupId(groupId).map { it.toInfo() }

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

        override suspend fun validateUrls(): ServerUrlInfo {
            val group = serverGroupDao.getById(groupId) ?: throw ServerException("Server group not found: $groupId")
            val candidates = urlCandidatesFor(groupId, group.healthCheckPath)
            val winningUrl = urlSelector.invalidateAndReselect(candidates).getOrElse {
                throw ServerException("Could not resolve a healthy URL for group $groupId: ${it.message}")
            }
            return serverUrlDao.getByGroupId(groupId).first { it.url.trimEnd('/') == winningUrl }.toInfo()
        }
    }
}

private fun ServerPluginRegistration.toInfo() = ProviderInfo(id = id, displayName = displayName, version = version)

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
