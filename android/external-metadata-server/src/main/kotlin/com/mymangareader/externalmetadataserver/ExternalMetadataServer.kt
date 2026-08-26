package com.mymangareader.externalmetadataserver

import com.mymangareader.cache.Cache
import com.mymangareader.core.database.ExternalMetadataGroupDao
import com.mymangareader.core.database.ExternalMetadataGroupEntity
import com.mymangareader.core.database.ExternalMetadataUrlDao
import com.mymangareader.core.database.ExternalMetadataUrlEntity
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataMatch
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataPlugin
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataPluginRegistration
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataSeriesRef
import com.mymangareader.server.Server
import com.mymangareader.tools.network.RequestTool
import com.mymangareader.tools.network.UrlCandidate
import com.mymangareader.tools.network.UrlSelector
import java.io.IOException
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.Serializable

class ExternalMetadataServerException(message: String) : Exception(message)

private fun requireNotBlank(fieldName: String, value: String?) {
    if (value?.isBlank() == true) throw ExternalMetadataServerException("$fieldName must not be blank")
}

private fun requirePositive(fieldName: String, value: Int?) {
    if (value != null && value <= 0) throw ExternalMetadataServerException("$fieldName must be positive")
}

private fun requireNotNegative(fieldName: String, value: Int?) {
    if (value != null && value < 0) throw ExternalMetadataServerException("$fieldName must not be negative")
}

data class ProviderInfo(
    val id: String,
    val displayName: String,
    val version: String,
)

data class ExternalMetadataGroupInfo(
    val id: String,
    val name: String,
    val providerId: String,
    val credentialsJson: String,
    val healthCheckPath: String,
    val linkedServerGroupId: String?,
)

data class ExternalMetadataUrlInfo(
    val id: String,
    val groupId: String,
    val url: String,
    val timeoutMs: Int,
    val priority: Int,
    val linkedServerUrlId: String?,
)

data class NewExternalMetadataGroup(
    val name: String,
    val providerId: String,
    val credentialsJson: String,
    val healthCheckPath: String,
    val linkedServerGroupId: String? = null,
)

data class NewExternalMetadataUrl(
    val url: String,
    val timeoutMs: Int,
    val priority: Int,
    val linkedServerUrlId: String? = null,
)

@Serializable
data class ExternalMetadataActiveInfo(
    val groupId: String,
    val groupName: String,
    val providerId: String,
    val urlId: String,
    val url: String,
    val timeoutMs: Int,
    val priority: Int,
)

data class ExternalMetadataResponse<T>(
    val data: T,
    val serverInfo: ExternalMetadataActiveInfo,
    val resolvedAtEpochMs: Long,
)

// group(groupId).getInfo()'s own shape — mirrors Server.ServerGroupFullInfo: the group's identity
// (no credentialsJson/healthCheckPath) plus its full list of URLs embedded.
data class ExternalMetadataGroupFullInfo(
    val id: String,
    val name: String,
    val providerId: String,
    val urls: List<ExternalMetadataUrlInfo>,
)

/**
 * `ExternalMetadataServer` only ever imports [ExternalMetadataPlugin]/
 * [ExternalMetadataPluginRegistration] — never a concrete plugin like `M3Plugin` directly. Same
 * generalizer shape as `:server`'s `Server`, replicated as closely as possible: [providers]/
 * [groups]/[group]/active-group state ([setActiveGroup]/[getActiveGroupId]/[getActive]/
 * [getActiveInfo]/[getActiveGroupInfo])/[activeMutex] all mirror `Server` directly. The only real
 * structural difference is there's no content tree (no `serials`/`chapters`/`page`) — [match]/
 * [matches] are the sole domain operations, playing the role `Server.serials`/`serial(id)` play.
 *
 * `Server` is never a constructor dependency (no permanent reference held) — it's only a type
 * used by [match]/[matches]' `syncByServerId`/`syncByServerUrl` variants and by the no-hint
 * resolver, which take a live `Server` instance by parameter each time they need same-layer
 * information (R1) — see `resolveNoHint`.
 */
@Singleton
class ExternalMetadataServer @Inject constructor(
    private val externalMetadataGroupDao: ExternalMetadataGroupDao,
    private val externalMetadataUrlDao: ExternalMetadataUrlDao,
    private val pluginRegistrations: @JvmSuppressWildcards Map<String, ExternalMetadataPluginRegistration>,
    private val urlSelector: UrlSelector,
    private val requestTool: RequestTool,
    private val cache: Cache,
) {
    private val activeMutex = Mutex()
    private var activeGroupId: String? = null

    // Same role as Server.sessionByGroupId — M3 has no real session concept today (auth is a
    // no-op), so this map simply stays empty in practice, but the mechanism exists so a future
    // provider with real auth doesn't require reshaping this class.
    private val sessionByGroupId = mutableMapOf<String, String>()

    // Same role as Server.lastActiveInfoByGroupId — the ExternalMetadataActiveInfo resolvePlugin
    // built the last time it ran for this group, never re-resolved/re-fetched afterward.
    private val lastActiveInfoByGroupId = mutableMapOf<String, ExternalMetadataActiveInfo>()

    val providers: Providers = object : Providers {
        override fun list(): List<ProviderInfo> = pluginRegistrations.values.map { it.toInfo() }
    }

    val groups: Groups = object : Groups {
        override suspend fun list(): List<ExternalMetadataGroupInfo> = externalMetadataGroupDao.getAll().map { it.toInfo() }

        override suspend fun get(groupId: String): ExternalMetadataGroupInfo? = externalMetadataGroupDao.getById(groupId)?.toInfo()

        override suspend fun add(group: NewExternalMetadataGroup): ExternalMetadataGroupInfo {
            pluginRegistrations[group.providerId]
                ?: throw ExternalMetadataServerException("Unknown providerId: ${group.providerId}")
            requireNotBlank("name", group.name)
            requireNotBlank("healthCheckPath", group.healthCheckPath)
            val entity = ExternalMetadataGroupEntity(
                id = UUID.randomUUID().toString(),
                name = group.name,
                providerId = group.providerId,
                credentialsJson = group.credentialsJson,
                healthCheckPath = group.healthCheckPath,
                linkedServerGroupId = group.linkedServerGroupId,
            )
            externalMetadataGroupDao.upsert(entity)
            return entity.toInfo()
        }

        override suspend fun update(
            groupId: String,
            name: String?,
            credentialsJson: String?,
            healthCheckPath: String?,
            linkedServerGroupId: String?,
        ): ExternalMetadataGroupInfo {
            val existing = externalMetadataGroupDao.getById(groupId)
                ?: throw ExternalMetadataServerException("External metadata group not found: $groupId")
            requireNotBlank("name", name)
            requireNotBlank("healthCheckPath", healthCheckPath)
            val updated = existing.copy(
                name = name ?: existing.name,
                credentialsJson = credentialsJson ?: existing.credentialsJson,
                healthCheckPath = healthCheckPath ?: existing.healthCheckPath,
                linkedServerGroupId = linkedServerGroupId ?: existing.linkedServerGroupId,
            )
            externalMetadataGroupDao.upsert(updated)
            // Same as Server.groups.update: the stale session was issued for the old credentials
            // — clear it so the next content call authenticates fresh instead of reusing it.
            if (credentialsJson != null && credentialsJson != existing.credentialsJson) {
                activeMutex.withLock { sessionByGroupId.remove(groupId) }
            }
            return updated.toInfo()
        }

        override suspend fun remove(groupId: String) {
            externalMetadataUrlDao.deleteByGroupId(groupId)
            externalMetadataGroupDao.deleteById(groupId)
        }
    }

    fun group(groupId: String): Group = GroupHandle(groupId)

    // ── active-group state — mirrors Server.setActiveGroup/reauthenticateActiveGroup/
    // getActiveGroupId/getActive/getActiveInfo/getActiveGroupInfo exactly ─────────────────────

    suspend fun setActiveGroup(groupId: String) = activeMutex.withLock {
        if (sessionByGroupId[groupId] == null) {
            val plugin = resolvePluginLocked(groupId, sessionJson = null)
            plugin.auth.authenticate()
            plugin.auth.getSession()?.let { sessionByGroupId[groupId] = it }
        }
        activeGroupId = groupId
    }

    suspend fun reauthenticateActiveGroup(groupId: String) = activeMutex.withLock {
        sessionByGroupId.remove(groupId)
        val plugin = resolvePluginLocked(groupId, sessionJson = null)
        plugin.auth.authenticate()
        plugin.auth.getSession()?.let { sessionByGroupId[groupId] = it }
        activeGroupId = groupId
    }

    fun getActiveGroupId(): String? = activeGroupId

    suspend fun getActive(): ExternalMetadataUrlInfo? {
        val groupId = activeGroupId ?: return null
        return group(groupId).getActive()
    }

    suspend fun getActiveInfo(): ExternalMetadataActiveInfo? {
        val groupId = activeGroupId ?: return null
        return activeMutex.withLock { lastActiveInfoByGroupId[groupId] }
    }

    suspend fun getActiveGroupInfo(): ExternalMetadataGroupFullInfo? {
        val groupId = activeGroupId ?: return null
        return group(groupId).getInfo()
    }

    // ── match/matches ────────────────────────────────────────────────────────────────────────
    //
    // Namespaced (not a syncMatch/syncMatches name pair — one letter apart, easy to misread) —
    // match (singular) and matches (batch) each expose the same 4 resolution shapes.
    //
    // sync() mirrors Server.serials.list()'s own shape: uses whatever group is already active
    // (activeGroupId), retrying within that same group on a network failure — but unlike Server
    // (where RN always calls setActiveGroup first), ExternalMetadataServer may never have had
    // setActiveGroup called at all. In that case (or when the active group's own retry is
    // exhausted), it falls through to [resolveNoHint], which may activate a *different* group —
    // see that function's own doc for the 2-level fallback (linked group's URLs, then the pool of
    // every unlinked group's URLs).

    val match: Match = object : Match {
        override suspend fun sync(series: ExternalMetadataSeriesRef, server: Server): ExternalMetadataResponse<ExternalMetadataMatch?> =
            syncActive(server) { it.fetchMatch(series) }

        override suspend fun syncByGroup(groupId: String, series: ExternalMetadataSeriesRef): ExternalMetadataResponse<ExternalMetadataMatch?> =
            envelopedFor(groupId) { withUrlRetry(groupId) { it.fetchMatch(series) } }

        override suspend fun syncByServerId(kavitaServerGroupId: String, series: ExternalMetadataSeriesRef): ExternalMetadataResponse<ExternalMetadataMatch?> =
            syncByGroup(resolveGroupIdByServerId(kavitaServerGroupId), series)

        override suspend fun syncByServerUrl(server: Server, kavitaUrl: String, series: ExternalMetadataSeriesRef): ExternalMetadataResponse<ExternalMetadataMatch?> =
            syncByGroup(resolveGroupIdByServerUrl(server, kavitaUrl), series)
    }

    val matches: Matches = object : Matches {
        override suspend fun sync(series: List<ExternalMetadataSeriesRef>, server: Server): ExternalMetadataResponse<List<ExternalMetadataMatch?>> =
            syncActive(server) { it.fetchMatches(series) }

        override suspend fun syncByGroup(groupId: String, series: List<ExternalMetadataSeriesRef>): ExternalMetadataResponse<List<ExternalMetadataMatch?>> =
            envelopedFor(groupId) { withUrlRetry(groupId) { it.fetchMatches(series) } }

        override suspend fun syncByServerId(kavitaServerGroupId: String, series: List<ExternalMetadataSeriesRef>): ExternalMetadataResponse<List<ExternalMetadataMatch?>> =
            syncByGroup(resolveGroupIdByServerId(kavitaServerGroupId), series)

        override suspend fun syncByServerUrl(server: Server, kavitaUrl: String, series: List<ExternalMetadataSeriesRef>): ExternalMetadataResponse<List<ExternalMetadataMatch?>> =
            syncByGroup(resolveGroupIdByServerUrl(server, kavitaUrl), series)
    }

    // Shared by match.sync/matches.sync — [action] is the raw plugin call (fetchMatch/
    // fetchMatches), bound by the caller. If activeGroupId is null, resolves+activates one via
    // [resolveNoHint] first. Runs [action] through withUrlRetry (in-group retry) against that
    // group; if it still fails, falls through to resolveNoHint again — which may land on a
    // *different* group (the unlinked pool) — and retries once more against that, enveloping
    // whichever attempt succeeded.
    private suspend fun <T> syncActive(server: Server, action: suspend (ExternalMetadataPlugin) -> T): ExternalMetadataResponse<T> {
        val groupId = activeGroupId ?: resolveNoHint(server).also { setActiveGroup(it) }
        return try {
            envelopedFor(groupId) { withUrlRetry(groupId, action) }
        } catch (e: IOException) {
            val fallbackGroupId = resolveNoHint(server)
            setActiveGroup(fallbackGroupId)
            envelopedFor(fallbackGroupId) { withUrlRetry(fallbackGroupId, action) }
        }
    }

    // Resolves which group to activate when no hint was given at all — same-layer composition
    // (R1), [server] taken by parameter, never stored. Two levels, per the design notes:
    // 1) if a Kavita server group is active, and an ExternalMetadataGroupEntity is linked to it,
    //    try that group's own URLs (UrlSelector picks the healthy one among them);
    // 2) if there's no link, or every URL in that linked group is unreachable, fall back to the
    //    pool of every URL belonging to a group with no link at all (linkedServerGroupId == null)
    //    — pooled across groups, not tried group-by-group, since an unlinked group is by
    //    definition interchangeable with any other for this purpose.
    // Throws if neither level yields a healthy URL.
    private suspend fun resolveNoHint(server: Server): String {
        val allGroups = externalMetadataGroupDao.getAll()

        val kavitaServerGroupId = server.getActiveGroupId()
        val linkedGroupId = kavitaServerGroupId?.let { id -> allGroups.firstOrNull { it.linkedServerGroupId == id }?.id }

        if (linkedGroupId != null) {
            val candidates = urlCandidatesForGroup(linkedGroupId, allGroups)
            if (candidates.isNotEmpty() && urlSelector.getActiveUrl(candidates).isSuccess) return linkedGroupId
        }

        val unlinkedGroups = allGroups.filter { it.linkedServerGroupId == null }
        val poolCandidates = unlinkedGroups.flatMap { g -> urlCandidatesForGroup(g.id, allGroups) }
        val winningUrl = urlSelector.getActiveUrl(poolCandidates).getOrElse {
            throw ExternalMetadataServerException("No healthy external metadata group could be resolved")
        }
        return externalMetadataUrlDao.getAll().first { it.url.trimEnd('/') == winningUrl }.groupId
    }

    private suspend fun urlCandidatesForGroup(groupId: String, allGroups: List<ExternalMetadataGroupEntity>): List<UrlCandidate> {
        val healthCheckPath = allGroups.firstOrNull { it.id == groupId }?.healthCheckPath ?: return emptyList()
        return externalMetadataUrlDao.getByGroupId(groupId).map { it.toUrlCandidate(healthCheckPath) }
    }

    private suspend fun resolveGroupIdByServerId(kavitaServerGroupId: String): String =
        externalMetadataGroupDao.getAll().firstOrNull { it.linkedServerGroupId == kavitaServerGroupId }?.id
            ?: firstUnlinkedGroupId()
            ?: throw ExternalMetadataServerException("No external metadata group linked to server group $kavitaServerGroupId, and no unlinked fallback configured")

    private suspend fun resolveGroupIdByServerUrl(server: Server, kavitaUrl: String): String {
        val matchingServerUrl = server.groups.list().firstNotNullOfOrNull { group ->
            server.group(group.id).getUrls().firstOrNull { it.url.trimEnd('/') == kavitaUrl.trimEnd('/') }
        }

        return matchingServerUrl?.let { serverUrl ->
            externalMetadataUrlDao.getAll().firstOrNull { it.linkedServerUrlId == serverUrl.id }?.groupId
        } ?: matchingServerUrl?.let { serverUrl ->
            externalMetadataGroupDao.getAll().firstOrNull { it.linkedServerGroupId == serverUrl.groupId }?.id
        } ?: firstUnlinkedGroupId()
            ?: throw ExternalMetadataServerException("No external metadata group linked to server url $kavitaUrl, and no unlinked fallback configured")
    }

    private suspend fun firstUnlinkedGroupId(): String? =
        externalMetadataGroupDao.getAll().firstOrNull { it.linkedServerGroupId == null }?.id

    // Shared by match/matches — runs [action] (already wrapped in withUrlRetry by the caller) and
    // wraps its result in a ExternalMetadataResponse using whatever resolvePlugin just recorded
    // for this group.
    private suspend fun <T> envelopedFor(groupId: String, action: suspend () -> T): ExternalMetadataResponse<T> {
        val data = action()
        val serverInfo = lastActiveInfoByGroupId[groupId]
            ?: throw ExternalMetadataServerException("No resolution recorded for group $groupId after a successful sync call — this should be unreachable")
        return ExternalMetadataResponse(data = data, serverInfo = serverInfo, resolvedAtEpochMs = System.currentTimeMillis())
    }

    // Same retry shape as Server.withUrlRetry: tries with the currently-resolved URL for
    // [groupId]; on a network failure, forces a fresh URL selection within that SAME group and
    // retries exactly once more. A second failure propagates — two dead URLs in a row within one
    // group means the group itself is unreachable right now (syncActive's own caller is
    // responsible for then trying a different group via resolveNoHint).
    private suspend fun <T> withUrlRetry(groupId: String, action: suspend (ExternalMetadataPlugin) -> T): T {
        return try {
            action(resolvePlugin(groupId))
        } catch (e: IOException) {
            action(resolvePlugin(groupId, forceUrlReselect = true))
        }
    }

    private suspend fun resolvePlugin(groupId: String, forceUrlReselect: Boolean = false): ExternalMetadataPlugin =
        activeMutex.withLock { resolvePluginLocked(groupId, sessionByGroupId[groupId], forceUrlReselect) }

    // Same as Server.resolvePlugin — must run under activeMutex (callers already hold it via
    // setActiveGroup/reauthenticateActiveGroup, or resolvePlugin acquires it itself).
    private suspend fun resolvePluginLocked(groupId: String, sessionJson: String?, forceUrlReselect: Boolean = false): ExternalMetadataPlugin {
        val group = externalMetadataGroupDao.getById(groupId)
            ?: throw ExternalMetadataServerException("External metadata group not found: $groupId")
        val registration = pluginRegistrations[group.providerId]
            ?: throw ExternalMetadataServerException("Unknown providerId for group: ${group.providerId}")

        val candidates = urlCandidatesFor(groupId, group.healthCheckPath)
        val selection = if (forceUrlReselect) urlSelector.invalidateAndReselect(candidates) else urlSelector.getActiveUrl(candidates)
        val activeUrl = selection.getOrElse {
            throw ExternalMetadataServerException("Could not resolve a healthy URL for group $groupId: ${it.message}")
        }

        externalMetadataUrlDao.getByGroupId(groupId).firstOrNull { it.url.trimEnd('/') == activeUrl }?.let {
            lastActiveInfoByGroupId[groupId] = buildActiveInfo(group, it)
        }

        return registration.factory(requestTool, cache, activeUrl, group.credentialsJson)
    }

    private fun buildActiveInfo(group: ExternalMetadataGroupEntity, url: ExternalMetadataUrlEntity) = ExternalMetadataActiveInfo(
        groupId = group.id,
        groupName = group.name,
        providerId = group.providerId,
        urlId = url.id,
        url = url.url,
        timeoutMs = url.timeoutMs,
        priority = url.priority,
    )

    private suspend fun urlCandidatesFor(groupId: String, healthCheckPath: String): List<UrlCandidate> =
        externalMetadataUrlDao.getByGroupId(groupId).map { it.toUrlCandidate(healthCheckPath) }

    interface Providers {
        fun list(): List<ProviderInfo>
    }

    interface Groups {
        suspend fun list(): List<ExternalMetadataGroupInfo>
        suspend fun get(groupId: String): ExternalMetadataGroupInfo?
        suspend fun add(group: NewExternalMetadataGroup): ExternalMetadataGroupInfo
        suspend fun update(
            groupId: String,
            name: String? = null,
            credentialsJson: String? = null,
            healthCheckPath: String? = null,
            linkedServerGroupId: String? = null,
        ): ExternalMetadataGroupInfo
        suspend fun remove(groupId: String)
    }

    interface Group {
        suspend fun getUrls(): List<ExternalMetadataUrlInfo>
        suspend fun getInfo(): ExternalMetadataGroupFullInfo
        suspend fun addUrl(url: NewExternalMetadataUrl): ExternalMetadataUrlInfo
        suspend fun updateUrl(urlId: String, url: String? = null, timeoutMs: Int? = null, priority: Int? = null, linkedServerUrlId: String? = null): ExternalMetadataUrlInfo
        suspend fun removeUrl(urlId: String)
        suspend fun validateUrls(): ExternalMetadataUrlInfo
        suspend fun getActive(): ExternalMetadataUrlInfo?
    }

    interface Match {
        suspend fun sync(series: ExternalMetadataSeriesRef, server: Server): ExternalMetadataResponse<ExternalMetadataMatch?>
        suspend fun syncByGroup(groupId: String, series: ExternalMetadataSeriesRef): ExternalMetadataResponse<ExternalMetadataMatch?>
        suspend fun syncByServerId(kavitaServerGroupId: String, series: ExternalMetadataSeriesRef): ExternalMetadataResponse<ExternalMetadataMatch?>
        suspend fun syncByServerUrl(server: Server, kavitaUrl: String, series: ExternalMetadataSeriesRef): ExternalMetadataResponse<ExternalMetadataMatch?>
    }

    interface Matches {
        suspend fun sync(series: List<ExternalMetadataSeriesRef>, server: Server): ExternalMetadataResponse<List<ExternalMetadataMatch?>>
        suspend fun syncByGroup(groupId: String, series: List<ExternalMetadataSeriesRef>): ExternalMetadataResponse<List<ExternalMetadataMatch?>>
        suspend fun syncByServerId(kavitaServerGroupId: String, series: List<ExternalMetadataSeriesRef>): ExternalMetadataResponse<List<ExternalMetadataMatch?>>
        suspend fun syncByServerUrl(server: Server, kavitaUrl: String, series: List<ExternalMetadataSeriesRef>): ExternalMetadataResponse<List<ExternalMetadataMatch?>>
    }

    private inner class GroupHandle(private val groupId: String) : Group {
        override suspend fun getUrls(): List<ExternalMetadataUrlInfo> = externalMetadataUrlDao.getByGroupId(groupId).map { it.toInfo() }

        override suspend fun getInfo(): ExternalMetadataGroupFullInfo {
            val group = externalMetadataGroupDao.getById(groupId) ?: throw ExternalMetadataServerException("External metadata group not found: $groupId")
            return ExternalMetadataGroupFullInfo(
                id = group.id,
                name = group.name,
                providerId = group.providerId,
                urls = getUrls(),
            )
        }

        override suspend fun addUrl(url: NewExternalMetadataUrl): ExternalMetadataUrlInfo {
            externalMetadataGroupDao.getById(groupId) ?: throw ExternalMetadataServerException("External metadata group not found: $groupId")
            requireNotBlank("url", url.url)
            requirePositive("timeoutMs", url.timeoutMs)
            requireNotNegative("priority", url.priority)
            val entity = ExternalMetadataUrlEntity(
                id = UUID.randomUUID().toString(),
                groupId = groupId,
                url = url.url,
                timeoutMs = url.timeoutMs,
                priority = url.priority,
                linkedServerUrlId = url.linkedServerUrlId,
            )
            externalMetadataUrlDao.upsert(entity)
            return entity.toInfo()
        }

        override suspend fun updateUrl(urlId: String, url: String?, timeoutMs: Int?, priority: Int?, linkedServerUrlId: String?): ExternalMetadataUrlInfo {
            val existing = externalMetadataUrlDao.getById(urlId)?.takeIf { it.groupId == groupId }
                ?: throw ExternalMetadataServerException("External metadata url not found: $urlId in group $groupId")
            requireNotBlank("url", url)
            requirePositive("timeoutMs", timeoutMs)
            requireNotNegative("priority", priority)
            val updated = existing.copy(
                url = url ?: existing.url,
                timeoutMs = timeoutMs ?: existing.timeoutMs,
                priority = priority ?: existing.priority,
                linkedServerUrlId = linkedServerUrlId ?: existing.linkedServerUrlId,
            )
            externalMetadataUrlDao.upsert(updated)
            return updated.toInfo()
        }

        override suspend fun removeUrl(urlId: String) {
            val existing = externalMetadataUrlDao.getById(urlId)?.takeIf { it.groupId == groupId }
                ?: throw ExternalMetadataServerException("External metadata url not found: $urlId in group $groupId")
            externalMetadataUrlDao.deleteById(existing.id)
        }

        override suspend fun validateUrls(): ExternalMetadataUrlInfo {
            val group = externalMetadataGroupDao.getById(groupId) ?: throw ExternalMetadataServerException("External metadata group not found: $groupId")
            val candidates = urlCandidatesFor(groupId, group.healthCheckPath)
            val winningUrl = urlSelector.invalidateAndReselect(candidates).getOrElse {
                throw ExternalMetadataServerException("Could not resolve a healthy URL for group $groupId: ${it.message}")
            }
            return externalMetadataUrlDao.getByGroupId(groupId).first { it.url.trimEnd('/') == winningUrl }.toInfo()
        }

        override suspend fun getActive(): ExternalMetadataUrlInfo? = activeMutex.withLock {
            lastActiveInfoByGroupId[groupId]?.let {
                ExternalMetadataUrlInfo(id = it.urlId, groupId = it.groupId, url = it.url, timeoutMs = it.timeoutMs, priority = it.priority, linkedServerUrlId = null)
            }
        }
    }
}

private fun ExternalMetadataPluginRegistration.toInfo() = ProviderInfo(id = id, displayName = displayName, version = version)

private fun ExternalMetadataGroupEntity.toInfo() = ExternalMetadataGroupInfo(
    id = id,
    name = name,
    providerId = providerId,
    credentialsJson = credentialsJson,
    healthCheckPath = healthCheckPath,
    linkedServerGroupId = linkedServerGroupId,
)

private fun ExternalMetadataUrlEntity.toInfo() = ExternalMetadataUrlInfo(
    id = id,
    groupId = groupId,
    url = url,
    timeoutMs = timeoutMs,
    priority = priority,
    linkedServerUrlId = linkedServerUrlId,
)

private fun ExternalMetadataUrlEntity.toUrlCandidate(healthCheckPath: String) = UrlCandidate(
    id = id,
    url = url,
    timeoutMs = timeoutMs,
    priority = priority,
    healthCheckPath = healthCheckPath,
)
