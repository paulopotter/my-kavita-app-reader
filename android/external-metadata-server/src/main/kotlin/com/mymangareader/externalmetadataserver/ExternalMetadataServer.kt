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
import com.mymangareader.tools.network.UrlProbeResult
import com.mymangareader.tools.network.UrlSelector
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeoutOrNull
import android.util.Log
import androidx.annotation.VisibleForTesting
import kotlinx.serialization.Serializable
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.serialization.encodeToString
import java.io.IOException
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

// How long a first fetch may hold up the screen when nothing is cached. Kept short on purpose:
// the wait is felt on every first open of a series, and outrunning it costs little now that
// finishing late still reaches the screen (the fetch keeps running, fills the cache and announces
// itself, so the page updates in place instead of waiting for the next visit).
private const val MATCH_FIRST_FETCH_WINDOW_MS = 1_000L

// The ceiling on a forced read (pull-to-refresh). Much longer than the unattended window — the
// user asked for this and is watching — but still a ceiling: past it the refresh finishes in the
// background and the screen says so, instead of holding its loading state indefinitely.
// How many enrichment requests may be in flight at once, across every caller.
//
// Without a ceiling, opening the library fired one request per series — 94 at the same time,
// measured on device — and a personal metadata server simply stopped answering any of them. The
// resulting timeouts then made every screen pay its full wait window for nothing, so the app was
// effectively strangling itself.
//
// 4 is the starting point, not a law: it keeps a small local server comfortable while still
// overlapping enough work to stay quick. [maxConcurrentMatchFetches] changes it.
private const val DEFAULT_MAX_CONCURRENT_MATCH_FETCHES = 4

private const val MATCH_FORCED_FETCH_WINDOW_MS = 8_000L

// Below this age a stored match is served as-is, with no background refresh: opening a series,
// going back and opening it again must not fire a request every time.
private const val MATCH_CACHE_FRESH_WINDOW_MS = 5 * 60 * 1000L

// How long a resolved match survives, app restarts included. Enrichment metadata changes on the
// order of a provider's scan (hours), never of a navigation, so a day-old answer is still a good
// answer — and serving it instantly beats blocking the screen on a fresh round trip.
private const val MATCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000L

// One domain for every stored match, so the whole enrichment cache can be dropped in a single
// call without touching anybody else's rows.
private const val MATCH_CACHE_DOMAIN = "externalMetadata:match"

// Enrichment is a best-effort layer: a provider being down must never surface as an error on a
// screen that already rendered. It is logged rather than swallowed so a silent gap is still
// diagnosable from the device log.
private const val MATCH_LOG_TAG = "MMR-ExternalMetadata"

private val matchJson = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }

// "No match for this series" is a real, cacheable answer — worth storing precisely because it is
// the case that otherwise costs the most (a per-series miss falls back to scanning a full
// listing). A bare null could not be told apart from "nothing stored", hence the wrapper.
@Serializable
private data class StoredMatch(
    val match: ExternalMetadataMatch?,
)

// Keyed by the plugin that produced it plus the provider-qualified series identity: two providers
// may legitimately answer differently for the same series, and the same id means different series
// on different content providers.
private fun matchCacheKey(
    pluginId: String,
    series: ExternalMetadataSeriesRef,
) = "externalMetadata:match:$pluginId:${series.providerId}:${series.id}"

// Announced when enrichment work that outlived a caller's wait has finished. Carries no match:
// the result is already in the cache, so a listener re-reads through the normal path rather than
// being handed data through a second channel. [ok] false means the work finished and failed.
data class ExternalMetadataResolvedEvent(
    val seriesId: String,
    val providerId: String,
    val ok: Boolean,
)

// A first fetch that outran its window. Not a failure: the work is still running and will fill
// the cache, so the next read answers instantly. Distinct from a real error so a caller can say
// "still loading" instead of "this went wrong".
class ExternalMetadataPendingException :
    Exception("External metadata is still being fetched")

// Distinguishes "the fetch produced null" from "the fetch didn't finish in time" through
// withTimeoutOrNull, which uses null itself to signal the timeout.
private data class Optional<T>(
    val value: T,
)

class ExternalMetadataServerException(
    message: String,
) : Exception(message)

private fun requireNotBlank(
    fieldName: String,
    value: String?,
) {
    if (value?.isBlank() == true) throw ExternalMetadataServerException("$fieldName must not be blank")
}

private fun requirePositive(
    fieldName: String,
    value: Int?,
) {
    if (value != null && value <= 0) throw ExternalMetadataServerException("$fieldName must be positive")
}

private fun requireNotNegative(
    fieldName: String,
    value: Int?,
) {
    if (value != null && value < 0) throw ExternalMetadataServerException("$fieldName must not be negative")
}

data class ProviderInfo(
    val id: String,
    val displayName: String,
    val version: String,
    // Mirrors the plugin's CredentialField list minus the non-serializable `validate` — same
    // shape as :server's ProviderInfo. A provider with no auth (e.g. the personal BFF) reports
    // an empty list, so the RN config form just renders no credential fields for it. `required`
    // is derived from the plugin's own validate (validate("") != null).
    val credentialFields: List<ProviderCredentialField>,
    // The liveness path this provider answers on — the RN config screen passes it into groups.add
    // so it never has to know a provider's endpoint. Same role as :server's ProviderInfo.
    val defaultHealthCheckPath: String,
)

data class ProviderCredentialField(
    val name: String,
    val label: String,
    val type: String,
    val required: Boolean,
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
class ExternalMetadataServer
    @Inject
    constructor(
        private val externalMetadataGroupDao: ExternalMetadataGroupDao,
        private val externalMetadataUrlDao: ExternalMetadataUrlDao,
        private val pluginRegistrations: @JvmSuppressWildcards Map<String, ExternalMetadataPluginRegistration>,
        private val urlSelector: UrlSelector,
        private val requestTool: RequestTool,
        private val cache: Cache,
    ) {
        // Where enrichment work that outlives a call runs. A settable property rather than a
        // constructor parameter because Hilt ignores Kotlin defaults and would demand a binding
        // for CoroutineDispatcher across the whole app; only tests ever assign it, to replace the
        // real dispatcher with their own scheduler (the first-fetch window is a real timeout, and
        // a real dispatcher fires it instantly against a test's virtual clock).
        @VisibleForTesting
        var backgroundDispatcher: CoroutineDispatcher = Dispatchers.IO
            set(value) {
                field = value
                backgroundScope = CoroutineScope(SupervisorJob() + value)
            }

        // Ceiling on concurrent enrichment requests (see DEFAULT_MAX_CONCURRENT_MATCH_FETCHES).
        // Settable so the limit can be tuned without a rebuild — assigning it swaps the semaphore,
        // which only affects requests that start afterwards; ones already in flight finish under
        // the old limit.
        var maxConcurrentMatchFetches: Int = DEFAULT_MAX_CONCURRENT_MATCH_FETCHES
            set(value) {
                require(value > 0) { "maxConcurrentMatchFetches must be positive" }
                field = value
                fetchSemaphore = Semaphore(value)
            }

        private var fetchSemaphore = Semaphore(DEFAULT_MAX_CONCURRENT_MATCH_FETCHES)

        // Background work that finished after its caller stopped waiting announces itself here.
        // A Flow rather than a direct RN emit: this module knows nothing about React, so the app
        // layer collects this and turns it into a device event — the same shape ActiveUrlWatcher
        // already uses. extraBufferCapacity so an emit never suspends the work that produced it.
        private val _resolved = MutableSharedFlow<ExternalMetadataResolvedEvent>(extraBufferCapacity = 32)
        val resolved: SharedFlow<ExternalMetadataResolvedEvent> = _resolved

        // Outlives any single call on purpose: a background refresh (and a first fetch that
        // outran its window) must keep running after the caller already got its answer, so the
        // cache is warm next time. SupervisorJob so one failed refresh never cancels the others.
        private var backgroundScope = CoroutineScope(SupervisorJob() + backgroundDispatcher)

        private val activeMutex = Mutex()
        private var activeGroupId: String? = null

        // Same role as Server.sessionByGroupId — M3 has no real session concept today (auth is a
        // no-op), so this map simply stays empty in practice, but the mechanism exists so a future
        // provider with real auth doesn't require reshaping this class.
        private val sessionByGroupId = mutableMapOf<String, String>()

        // Same role as Server.lastActiveInfoByGroupId — the ExternalMetadataActiveInfo resolvePlugin
        // built the last time it ran for this group, never re-resolved/re-fetched afterward.
        private val lastActiveInfoByGroupId = mutableMapOf<String, ExternalMetadataActiveInfo>()

        val providers: Providers =
            object : Providers {
                override fun list(): List<ProviderInfo> = pluginRegistrations.values.map { it.toInfo() }
            }

        val groups: Groups =
            object : Groups {
                override suspend fun list(): List<ExternalMetadataGroupInfo> = externalMetadataGroupDao.getAll().map { it.toInfo() }

                override suspend fun get(groupId: String): ExternalMetadataGroupInfo? = externalMetadataGroupDao.getById(groupId)?.toInfo()

                override suspend fun add(group: NewExternalMetadataGroup): ExternalMetadataGroupInfo {
                    pluginRegistrations[group.providerId]
                        ?: throw ExternalMetadataServerException("Unknown providerId: ${group.providerId}")
                    requireNotBlank("name", group.name)
                    requireNotBlank("healthCheckPath", group.healthCheckPath)
                    val entity =
                        ExternalMetadataGroupEntity(
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
                    val existing =
                        externalMetadataGroupDao.getById(groupId)
                            ?: throw ExternalMetadataServerException("External metadata group not found: $groupId")
                    requireNotBlank("name", name)
                    requireNotBlank("healthCheckPath", healthCheckPath)
                    val updated =
                        existing.copy(
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
                    // The URL selector caches its pick per group for 15 min. If the health-check path
                    // changed, that cache was computed against the OLD path — a URL that 404'd on
                    // "/health" might answer "/version". Drop it so the next resolve re-tests live.
                    if (healthCheckPath != null && healthCheckPath != existing.healthCheckPath) {
                        // MMR-DIAG (backlog 015-telemetria-interna-debug): healthCheckPath change + cache drop.
                        // Log.i("MMR-DIAG", "meta groups.update $groupId healthCheckPath '${existing.healthCheckPath}' → '$healthCheckPath'")
                        val candidates = urlCandidatesForGroup(groupId, externalMetadataGroupDao.getAll())
                        if (candidates.isNotEmpty()) urlSelector.invalidateAndReselect(candidates)
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

        suspend fun setActiveGroup(groupId: String) =
            activeMutex.withLock {
                if (sessionByGroupId[groupId] == null) {
                    val plugin = resolvePluginLocked(groupId, sessionJson = null)
                    plugin.auth.authenticate()
                    plugin.auth.getSession()?.let { sessionByGroupId[groupId] = it }
                }
                activeGroupId = groupId
            }

        suspend fun reauthenticateActiveGroup(groupId: String) =
            activeMutex.withLock {
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

        val match: Match =
            object : Match {
                override suspend fun sync(
                    series: ExternalMetadataSeriesRef,
                    server: Server,
                    force: Boolean,
                ): ExternalMetadataResponse<ExternalMetadataMatch?> =
                    syncActive(server) { plugin -> cachedMatch(plugin, series, force) { plugin.fetchMatch(series) } }

                override suspend fun syncByGroup(
                    groupId: String,
                    series: ExternalMetadataSeriesRef,
                    force: Boolean,
                ): ExternalMetadataResponse<ExternalMetadataMatch?> =
                    envelopedFor(groupId) { withUrlRetry(groupId) { plugin -> cachedMatch(plugin, series, force) { plugin.fetchMatch(series) } } }

                override suspend fun syncByServerId(
                    kavitaServerGroupId: String,
                    series: ExternalMetadataSeriesRef,
                    force: Boolean,
                ): ExternalMetadataResponse<ExternalMetadataMatch?> = syncByGroup(resolveGroupIdByServerId(kavitaServerGroupId), series, force)

                override suspend fun syncByServerUrl(
                    server: Server,
                    kavitaUrl: String,
                    series: ExternalMetadataSeriesRef,
                    force: Boolean,
                ): ExternalMetadataResponse<ExternalMetadataMatch?> = syncByGroup(resolveGroupIdByServerUrl(server, kavitaUrl), series, force)
            }

        val matches: Matches =
            object : Matches {
                override suspend fun sync(
                    series: List<ExternalMetadataSeriesRef>,
                    server: Server,
                ): ExternalMetadataResponse<List<ExternalMetadataMatch?>> = syncActive(server) { it.fetchMatches(series) }

                override suspend fun syncByGroup(
                    groupId: String,
                    series: List<ExternalMetadataSeriesRef>,
                ): ExternalMetadataResponse<List<ExternalMetadataMatch?>> = envelopedFor(groupId) { withUrlRetry(groupId) { it.fetchMatches(series) } }

                override suspend fun syncByServerId(
                    kavitaServerGroupId: String,
                    series: List<ExternalMetadataSeriesRef>,
                ): ExternalMetadataResponse<List<ExternalMetadataMatch?>> = syncByGroup(resolveGroupIdByServerId(kavitaServerGroupId), series)

                override suspend fun syncByServerUrl(
                    server: Server,
                    kavitaUrl: String,
                    series: List<ExternalMetadataSeriesRef>,
                ): ExternalMetadataResponse<List<ExternalMetadataMatch?>> = syncByGroup(resolveGroupIdByServerUrl(server, kavitaUrl), series)
            }

        // Shared by match.sync/matches.sync — [action] is the raw plugin call (fetchMatch/
        // fetchMatches), bound by the caller. If activeGroupId is null, resolves+activates one via
        // [resolveNoHint] first. Runs [action] through withUrlRetry (in-group retry) against that
        // group; if it still fails, falls through to resolveNoHint again — which may land on a
        // *different* group (the unlinked pool) — and retries once more against that, enveloping
        // whichever attempt succeeded.
        private suspend fun <T> syncActive(
            server: Server,
            action: suspend (ExternalMetadataPlugin) -> T,
        ): ExternalMetadataResponse<T> {
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
            val winningUrl =
                urlSelector.getActiveUrl(poolCandidates).getOrElse {
                    throw ExternalMetadataServerException("No healthy external metadata group could be resolved")
                }
            return externalMetadataUrlDao.getAll().first { it.url.trimEnd('/') == winningUrl }.groupId
        }

        private suspend fun urlCandidatesForGroup(
            groupId: String,
            allGroups: List<ExternalMetadataGroupEntity>,
        ): List<UrlCandidate> {
            val healthCheckPath = allGroups.firstOrNull { it.id == groupId }?.healthCheckPath ?: return emptyList()
            return externalMetadataUrlDao.getByGroupId(groupId).map { it.toUrlCandidate(healthCheckPath) }
        }

        private suspend fun resolveGroupIdByServerId(kavitaServerGroupId: String): String =
            externalMetadataGroupDao.getAll().firstOrNull { it.linkedServerGroupId == kavitaServerGroupId }?.id
                ?: firstUnlinkedGroupId()
                ?: throw ExternalMetadataServerException(
                    "No external metadata group linked to server group $kavitaServerGroupId, and no unlinked fallback configured",
                )

        private suspend fun resolveGroupIdByServerUrl(
            server: Server,
            kavitaUrl: String,
        ): String {
            val matchingServerUrl =
                server.groups.list().firstNotNullOfOrNull { group ->
                    server.group(group.id).getUrls().firstOrNull { it.url.trimEnd('/') == kavitaUrl.trimEnd('/') }
                }

            return matchingServerUrl?.let { serverUrl ->
                externalMetadataUrlDao.getAll().firstOrNull { it.linkedServerUrlId == serverUrl.id }?.groupId
            } ?: matchingServerUrl?.let { serverUrl ->
                externalMetadataGroupDao.getAll().firstOrNull { it.linkedServerGroupId == serverUrl.groupId }?.id
            } ?: firstUnlinkedGroupId()
                ?: throw ExternalMetadataServerException(
                    "No external metadata group linked to server url $kavitaUrl, and no unlinked fallback configured",
                )
        }

        private suspend fun firstUnlinkedGroupId(): String? = externalMetadataGroupDao.getAll().firstOrNull { it.linkedServerGroupId == null }?.id

        // Reading a single-series match never blocks the screen for long. This call sits on the
        // critical path of opening a series (buildSerialDigest waits for it before rendering), so
        // the policy is:
        //
        //   fresh cache          → serve it, touch no network
        //   stale cache          → serve it now, refresh in the background for next time
        //   no cache             → start the fetch, wait only MATCH_FIRST_FETCH_WINDOW_MS for it;
        //                          if it answers in time it goes out with this response, otherwise
        //                          the digest goes out without it and the fetch keeps running so
        //                          the next open finds it cached
        //   force               → ignore what is stored, fetch, and wait for the real answer
        //
        // The cache lives here rather than in a plugin on purpose: caching is policy, and the
        // plugin layer only translates one provider's API. Kotlin fetches and stores; what the
        // data then means is RN's decision.
        //
        // The batch (matches) deliberately stays out of this: it is one request answering many
        // series, so it never pays the per-series round trip this protects against, and its rows
        // carry fewer fields (see ExternalMetadataMatch's note) — letting them land under these
        // keys would overwrite a rich single-series answer with a thin one.
        private suspend fun cachedMatch(
            plugin: ExternalMetadataPlugin,
            series: ExternalMetadataSeriesRef,
            force: Boolean,
            fetch: suspend () -> ExternalMetadataMatch?,
        ): ExternalMetadataMatch? {
            val key = matchCacheKey(plugin.id, series)
            val stored = if (force) null else readStoredMatch(key)

            if (stored != null) {
                if (stored.isStale) refreshInBackground(series, key, fetch)
                return stored.match
            }

            // Whether anyone is still waiting on this fetch. Flipped the moment the window
            // elapses, so the coroutine below knows if its result arrived in time to be returned
            // normally or has to announce itself instead.
            val awaited = AtomicBoolean(true)

            val inFlight =
                backgroundScope.async {
                    runCatching { withFetchPermit { fetch() }.also { storeMatch(key, it) } }
                        .onFailure { Log.w(MATCH_LOG_TAG, "fetch failed for $key: ${it.message}") }
                        // Only announce a result nobody is waiting for any more: one that lands
                        // inside the window is returned to its caller, and announcing it too
                        // would tell the screen to refresh for data it already has.
                        .also { result -> if (!awaited.get()) announceResolved(series, ok = result.isSuccess) }
                        .getOrThrow()
                }

            // A forced read is the user asking for current data, so it waits far longer than an
            // unattended open — but not forever. An earlier version awaited with no ceiling at
            // all, and a slow provider held a pull-to-refresh for 85 seconds on device with the
            // screen stuck in its loading state. Past this, the fetch keeps running into the
            // cache and the refresh reports itself as pending, exactly like a first open that
            // outran its own window.
            //
            // A failure still propagates: with nothing cached to fall back on, "couldn't ask"
            // must stay distinguishable from "asked, and the provider has no entry" (the caller
            // turns the former into a Failure digest, the latter into a Success with no match).
            if (force) {
                return withTimeoutOrNull(MATCH_FORCED_FETCH_WINDOW_MS) { Optional(inFlight.await()) }?.value
                    ?: throw ExternalMetadataPendingException()
            }

            // Not cancelled on timeout: the point is that it finishes and populates the cache, so
            // the next open of this series is instant. Time spent queued behind the concurrency
            // limit counts against this window, which is the intended trade: the screen opens
            // without enrichment rather than waiting its turn, and the queued work still lands in
            // the cache and announces itself when it finishes. Outrunning the window is reported as its
            // own exception rather than as null — "still coming" and "the provider has no entry
            // for this series" look identical otherwise, and only the first one is worth telling
            // the user about.
            val inTime = withTimeoutOrNull(MATCH_FIRST_FETCH_WINDOW_MS) { Optional(inFlight.await()) }
            if (inTime != null) return inTime.value

            awaited.set(false)
            throw ExternalMetadataPendingException()
        }

        private data class StoredMatchEntry(
            val match: ExternalMetadataMatch?,
            val isStale: Boolean,
        )

        // An entry whose value no longer parses (an older stored shape, a truncated write) counts
        // as no entry at all: the live fetch is always available as the answer.
        private suspend fun readStoredMatch(key: String): StoredMatchEntry? {
            val entry = cache.persistent.get(key)?.takeUnless { it.isExpired } ?: return null
            val stored = runCatching { matchJson.decodeFromString<StoredMatch>(entry.value) }.getOrNull() ?: return null
            return StoredMatchEntry(
                match = stored.match,
                isStale = System.currentTimeMillis() - entry.cachedAtEpochMs >= MATCH_CACHE_FRESH_WINDOW_MS,
            )
        }

        // Fire-and-forget refresh of an entry that is still usable but no longer fresh. Failures
        // are swallowed by design: the caller already has a good-enough answer, and a provider
        // being down must never turn into an error on a screen that already rendered.
        private fun refreshInBackground(
            series: ExternalMetadataSeriesRef,
            key: String,
            fetch: suspend () -> ExternalMetadataMatch?,
        ) {
            backgroundScope.launch {
                val result = runCatching { storeMatch(key, withFetchPermit { fetch() }) }
                result.onFailure { Log.w(MATCH_LOG_TAG, "background refresh failed for $key: ${it.message}") }
                // The caller was served stale data and has moved on, so whatever this found is
                // only reachable by announcing it.
                announceResolved(series, ok = result.isSuccess)
            }
        }

        // Every enrichment request passes through here, so the ceiling holds across all callers —
        // a library opening 94 series at once queues instead of firing 94 requests. The permit
        // covers only the request itself: the cache read above and the write below stay outside
        // it, so a slow provider never blocks work that doesn't touch the network.
        private suspend fun <T> withFetchPermit(block: suspend () -> T): T = fetchSemaphore.withPermit { block() }

        private fun announceResolved(
            series: ExternalMetadataSeriesRef,
            ok: Boolean,
        ) {
            _resolved.tryEmit(
                ExternalMetadataResolvedEvent(seriesId = series.id, providerId = series.providerId, ok = ok),
            )
        }

        // A write failure never fails the read — the value is already in hand either way.
        private suspend fun storeMatch(
            key: String,
            match: ExternalMetadataMatch?,
        ) {
            runCatching {
                cache.persistent.put(
                    key = key,
                    value = matchJson.encodeToString(StoredMatch(match)),
                    domain = MATCH_CACHE_DOMAIN,
                    ttlMs = MATCH_CACHE_TTL_MS,
                )
            }
        }

        // Shared by match/matches — runs [action] (already wrapped in withUrlRetry by the caller) and
        // wraps its result in a ExternalMetadataResponse using whatever resolvePlugin just recorded
        // for this group.
        private suspend fun <T> envelopedFor(
            groupId: String,
            action: suspend () -> T,
        ): ExternalMetadataResponse<T> {
            val data = action()
            val serverInfo =
                lastActiveInfoByGroupId[groupId]
                    ?: throw ExternalMetadataServerException(
                        "No resolution recorded for group $groupId after a successful sync call — this should be unreachable",
                    )
            return ExternalMetadataResponse(data = data, serverInfo = serverInfo, resolvedAtEpochMs = System.currentTimeMillis())
        }

        // Same retry shape as Server.withUrlRetry: tries with the currently-resolved URL for
        // [groupId]; on a network failure, forces a fresh URL selection within that SAME group and
        // retries exactly once more. A second failure propagates — two dead URLs in a row within one
        // group means the group itself is unreachable right now (syncActive's own caller is
        // responsible for then trying a different group via resolveNoHint).
        private suspend fun <T> withUrlRetry(
            groupId: String,
            action: suspend (ExternalMetadataPlugin) -> T,
        ): T =
            try {
                action(resolvePlugin(groupId))
            } catch (e: IOException) {
                action(resolvePlugin(groupId, forceUrlReselect = true))
            }

        private suspend fun resolvePlugin(
            groupId: String,
            forceUrlReselect: Boolean = false,
        ): ExternalMetadataPlugin = activeMutex.withLock { resolvePluginLocked(groupId, sessionByGroupId[groupId], forceUrlReselect) }

        // Same as Server.resolvePlugin — must run under activeMutex (callers already hold it via
        // setActiveGroup/reauthenticateActiveGroup, or resolvePlugin acquires it itself).
        private suspend fun resolvePluginLocked(
            groupId: String,
            sessionJson: String?,
            forceUrlReselect: Boolean = false,
        ): ExternalMetadataPlugin {
            val group =
                externalMetadataGroupDao.getById(groupId)
                    ?: throw ExternalMetadataServerException("External metadata group not found: $groupId")
            val registration =
                pluginRegistrations[group.providerId]
                    ?: throw ExternalMetadataServerException("Unknown providerId for group: ${group.providerId}")

            val candidates = urlCandidatesFor(groupId, group.healthCheckPath)
            // MMR-DIAG (backlog 015-telemetria-interna-debug): what path/URL the metadata group resolves
            // against. Uncomment when the "connected" dot stays grey — showed the "Unknown providerId"
            // (pre-"m3" group) and the /api/health-vs-/version path mismatch.
            // Log.i(
            //     "MMR-DIAG",
            //     "meta resolvePlugin $groupId provider=${group.providerId} healthCheckPath='${group.healthCheckPath}' " +
            //         "candidates=${candidates.size} forceReselect=$forceUrlReselect",
            // )
            val selection = if (forceUrlReselect) urlSelector.invalidateAndReselect(candidates) else urlSelector.getActiveUrl(candidates)
            val activeUrl =
                selection.getOrElse {
                    // Log.w("MMR-DIAG", "meta resolvePlugin $groupId FAILED: ${it.message}")
                    throw ExternalMetadataServerException("Could not resolve a healthy URL for group $groupId: ${it.message}")
                }
            // Log.i("MMR-DIAG", "meta resolvePlugin $groupId → activeUrl=$activeUrl")

            externalMetadataUrlDao.getByGroupId(groupId).firstOrNull { it.url.trimEnd('/') == activeUrl }?.let {
                lastActiveInfoByGroupId[groupId] = buildActiveInfo(group, it)
            }

            return registration.factory(requestTool, cache, activeUrl, group.credentialsJson)
        }

        private fun buildActiveInfo(
            group: ExternalMetadataGroupEntity,
            url: ExternalMetadataUrlEntity,
        ) = ExternalMetadataActiveInfo(
            groupId = group.id,
            groupName = group.name,
            providerId = group.providerId,
            urlId = url.id,
            url = url.url,
            timeoutMs = url.timeoutMs,
            priority = url.priority,
        )

        private suspend fun urlCandidatesFor(
            groupId: String,
            healthCheckPath: String,
        ): List<UrlCandidate> = externalMetadataUrlDao.getByGroupId(groupId).map { it.toUrlCandidate(healthCheckPath) }

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

            suspend fun updateUrl(
                urlId: String,
                url: String? = null,
                timeoutMs: Int? = null,
                priority: Int? = null,
                linkedServerUrlId: String? = null,
            ): ExternalMetadataUrlInfo

            suspend fun removeUrl(urlId: String)

            // Point check on one typed-in URL — hits `<url><group healthCheckPath>` once, never
            // changes which URL is active (unlike validateUrls). Same contract as :server's testUrl.
            suspend fun testUrl(
                url: String,
                timeoutMs: Int = 5000,
            ): UrlProbeResult

            suspend fun validateUrls(): ExternalMetadataUrlInfo

            suspend fun getActive(): ExternalMetadataUrlInfo?
        }

        // [force] = the user explicitly asked for current data (a pull-to-refresh), so whatever is
        // stored is ignored and the call waits for the real answer. Left out (the default), a read
        // is served from cache when possible and only waits a short window when nothing is stored
        // — see cachedMatch for the full policy.
        interface Match {
            suspend fun sync(
                series: ExternalMetadataSeriesRef,
                server: Server,
                force: Boolean = false,
            ): ExternalMetadataResponse<ExternalMetadataMatch?>

            suspend fun syncByGroup(
                groupId: String,
                series: ExternalMetadataSeriesRef,
                force: Boolean = false,
            ): ExternalMetadataResponse<ExternalMetadataMatch?>

            suspend fun syncByServerId(
                kavitaServerGroupId: String,
                series: ExternalMetadataSeriesRef,
                force: Boolean = false,
            ): ExternalMetadataResponse<ExternalMetadataMatch?>

            suspend fun syncByServerUrl(
                server: Server,
                kavitaUrl: String,
                series: ExternalMetadataSeriesRef,
                force: Boolean = false,
            ): ExternalMetadataResponse<ExternalMetadataMatch?>
        }

        interface Matches {
            suspend fun sync(
                series: List<ExternalMetadataSeriesRef>,
                server: Server,
            ): ExternalMetadataResponse<List<ExternalMetadataMatch?>>

            suspend fun syncByGroup(
                groupId: String,
                series: List<ExternalMetadataSeriesRef>,
            ): ExternalMetadataResponse<List<ExternalMetadataMatch?>>

            suspend fun syncByServerId(
                kavitaServerGroupId: String,
                series: List<ExternalMetadataSeriesRef>,
            ): ExternalMetadataResponse<List<ExternalMetadataMatch?>>

            suspend fun syncByServerUrl(
                server: Server,
                kavitaUrl: String,
                series: List<ExternalMetadataSeriesRef>,
            ): ExternalMetadataResponse<List<ExternalMetadataMatch?>>
        }

        private inner class GroupHandle(
            private val groupId: String,
        ) : Group {
            override suspend fun getUrls(): List<ExternalMetadataUrlInfo> = externalMetadataUrlDao.getByGroupId(groupId).map { it.toInfo() }

            override suspend fun getInfo(): ExternalMetadataGroupFullInfo {
                val group =
                    externalMetadataGroupDao.getById(groupId)
                        ?: throw ExternalMetadataServerException("External metadata group not found: $groupId")
                return ExternalMetadataGroupFullInfo(
                    id = group.id,
                    name = group.name,
                    providerId = group.providerId,
                    urls = getUrls(),
                )
            }

            override suspend fun addUrl(url: NewExternalMetadataUrl): ExternalMetadataUrlInfo {
                externalMetadataGroupDao.getById(groupId)
                    ?: throw ExternalMetadataServerException("External metadata group not found: $groupId")
                requireNotBlank("url", url.url)
                requirePositive("timeoutMs", url.timeoutMs)
                requireNotNegative("priority", url.priority)
                val entity =
                    ExternalMetadataUrlEntity(
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

            override suspend fun updateUrl(
                urlId: String,
                url: String?,
                timeoutMs: Int?,
                priority: Int?,
                linkedServerUrlId: String?,
            ): ExternalMetadataUrlInfo {
                val existing =
                    externalMetadataUrlDao.getById(urlId)?.takeIf { it.groupId == groupId }
                        ?: throw ExternalMetadataServerException("External metadata url not found: $urlId in group $groupId")
                requireNotBlank("url", url)
                requirePositive("timeoutMs", timeoutMs)
                requireNotNegative("priority", priority)
                val updated =
                    existing.copy(
                        url = url ?: existing.url,
                        timeoutMs = timeoutMs ?: existing.timeoutMs,
                        priority = priority ?: existing.priority,
                        linkedServerUrlId = linkedServerUrlId ?: existing.linkedServerUrlId,
                    )
                externalMetadataUrlDao.upsert(updated)
                return updated.toInfo()
            }

            override suspend fun removeUrl(urlId: String) {
                val existing =
                    externalMetadataUrlDao.getById(urlId)?.takeIf { it.groupId == groupId }
                        ?: throw ExternalMetadataServerException("External metadata url not found: $urlId in group $groupId")
                externalMetadataUrlDao.deleteById(existing.id)
            }

            override suspend fun testUrl(
                url: String,
                timeoutMs: Int,
            ): UrlProbeResult {
                val group =
                    externalMetadataGroupDao.getById(groupId)
                        ?: throw ExternalMetadataServerException("External metadata group not found: $groupId")
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

            override suspend fun validateUrls(): ExternalMetadataUrlInfo {
                val group =
                    externalMetadataGroupDao.getById(groupId)
                        ?: throw ExternalMetadataServerException("External metadata group not found: $groupId")
                val candidates = urlCandidatesFor(groupId, group.healthCheckPath)
                val winningUrl =
                    urlSelector.invalidateAndReselect(candidates).getOrElse {
                        throw ExternalMetadataServerException("Could not resolve a healthy URL for group $groupId: ${it.message}")
                    }
                return externalMetadataUrlDao.getByGroupId(groupId).first { it.url.trimEnd('/') == winningUrl }.toInfo()
            }

            override suspend fun getActive(): ExternalMetadataUrlInfo? =
                activeMutex.withLock {
                    lastActiveInfoByGroupId[groupId]?.let {
                        ExternalMetadataUrlInfo(
                            id = it.urlId,
                            groupId = it.groupId,
                            url = it.url,
                            timeoutMs = it.timeoutMs,
                            priority = it.priority,
                            linkedServerUrlId = null,
                        )
                    }
                }
        }
    }

private fun ExternalMetadataPluginRegistration.toInfo() =
    ProviderInfo(
        id = id,
        displayName = displayName,
        version = version,
        credentialFields =
            credentialFields.map {
                ProviderCredentialField(
                    name = it.name,
                    label = it.label,
                    type = it.type,
                    required = it.validate("") != null,
                )
            },
        defaultHealthCheckPath = defaultHealthCheckPath,
    )

private fun ExternalMetadataGroupEntity.toInfo() =
    ExternalMetadataGroupInfo(
        id = id,
        name = name,
        providerId = providerId,
        credentialsJson = credentialsJson,
        healthCheckPath = healthCheckPath,
        linkedServerGroupId = linkedServerGroupId,
    )

private fun ExternalMetadataUrlEntity.toInfo() =
    ExternalMetadataUrlInfo(
        id = id,
        groupId = groupId,
        url = url,
        timeoutMs = timeoutMs,
        priority = priority,
        linkedServerUrlId = linkedServerUrlId,
    )

private fun ExternalMetadataUrlEntity.toUrlCandidate(healthCheckPath: String) =
    UrlCandidate(
        id = id,
        url = url,
        timeoutMs = timeoutMs,
        priority = priority,
        healthCheckPath = healthCheckPath,
    )
