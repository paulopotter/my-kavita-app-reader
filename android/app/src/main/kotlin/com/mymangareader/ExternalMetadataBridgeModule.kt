package com.mymangareader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.mymangareader.externalmetadataserver.ExternalMetadataActiveInfo
import com.mymangareader.externalmetadataserver.ExternalMetadataGroupFullInfo
import com.mymangareader.externalmetadataserver.ExternalMetadataGroupInfo
import com.mymangareader.externalmetadataserver.ExternalMetadataServer
import com.mymangareader.externalmetadataserver.ExternalMetadataUrlInfo
import com.mymangareader.externalmetadataserver.NewExternalMetadataGroup
import com.mymangareader.externalmetadataserver.NewExternalMetadataUrl
import com.mymangareader.externalmetadataserver.ProviderInfo
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataMatch
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataSeriesRef
import com.mymangareader.server.Server
import com.mymangareader.tools.network.UrlProbeResult
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

// RN→Kotlin bridge for the :external-metadata-server module's ExternalMetadataServer facade —
// one @ReactMethod per operation, same shape as ServerBridgeModule. Never adds logic of its own:
// any validation/orchestration decision belongs in ExternalMetadataServer, not here. [server] is
// only ever passed into match/matches.sync and .syncByServerUrl — same-layer composition (R1),
// never stored by ExternalMetadataServer itself.
@Singleton
class ExternalMetadataBridgeModule
    @Inject
    constructor(
        private val externalMetadataServer: ExternalMetadataServer,
        private val server: Server,
        context: ReactApplicationContext,
    ) : ReactContextBaseJavaModule(context) {
        override fun getName(): String = "ExternalMetadataBridgeModule"

        private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

        // ── providers ────────────────────────────────────────────────────────

        @ReactMethod
        fun listProviders(promise: Promise) {
            runCatching { externalMetadataServer.providers.list() }.resolveOrReject(
                promise,
                "LIST_PROVIDERS_ERROR",
            ) { it.toProvidersWritableArray() }
        }

        // ── groups ───────────────────────────────────────────────────────────

        @ReactMethod
        fun listGroups(promise: Promise) {
            scope.launch {
                runCatching { externalMetadataServer.groups.list() }.resolveOrReject(
                    promise,
                    "LIST_GROUPS_ERROR",
                ) { it.toGroupsWritableArray() }
            }
        }

        @ReactMethod
        fun getGroup(
            groupId: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching {
                    externalMetadataServer.groups.get(
                        groupId,
                    )
                }.resolveOrReject(promise, "GET_GROUP_ERROR") { it?.toWritableMap() }
            }
        }

        @ReactMethod
        fun addGroup(
            name: String,
            providerId: String,
            credentialsJson: String,
            healthCheckPath: String,
            linkedServerGroupId: String?,
            promise: Promise,
        ) {
            scope.launch {
                runCatching {
                    externalMetadataServer.groups.add(
                        NewExternalMetadataGroup(name, providerId, credentialsJson, healthCheckPath, linkedServerGroupId),
                    )
                }.resolveOrReject(promise, "ADD_GROUP_ERROR") { it.toWritableMap() }
            }
        }

        @ReactMethod
        fun updateGroup(
            groupId: String,
            name: String?,
            credentialsJson: String?,
            healthCheckPath: String?,
            linkedServerGroupId: String?,
            promise: Promise,
        ) {
            scope.launch {
                runCatching { externalMetadataServer.groups.update(groupId, name, credentialsJson, healthCheckPath, linkedServerGroupId) }
                    .resolveOrReject(promise, "UPDATE_GROUP_ERROR") { it.toWritableMap() }
            }
        }

        @ReactMethod
        fun removeGroup(
            groupId: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching { externalMetadataServer.groups.remove(groupId) }.resolveOrReject(promise, "REMOVE_GROUP_ERROR")
            }
        }

        // ── group(id) urls ───────────────────────────────────────────────────

        @ReactMethod
        fun getGroupUrls(
            groupId: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching {
                    externalMetadataServer.group(groupId).getUrls()
                }.resolveOrReject(promise, "GET_GROUP_URLS_ERROR") { it.toUrlsWritableArray() }
            }
        }

        @ReactMethod
        fun getGroupInfo(
            groupId: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching {
                    externalMetadataServer
                        .group(
                            groupId,
                        ).getInfo()
                }.resolveOrReject(promise, "GET_GROUP_INFO_ERROR") { it.toWritableMap() }
            }
        }

        @ReactMethod
        fun addGroupUrl(
            groupId: String,
            url: String,
            timeoutMs: Int,
            priority: Int,
            linkedServerUrlId: String?,
            promise: Promise,
        ) {
            scope.launch {
                runCatching {
                    externalMetadataServer
                        .group(
                            groupId,
                        ).addUrl(NewExternalMetadataUrl(url, timeoutMs, priority, linkedServerUrlId))
                }.resolveOrReject(promise, "ADD_GROUP_URL_ERROR") { it.toWritableMap() }
            }
        }

        // timeoutMs / priority use a negative sentinel for "leave unchanged" — see the same note on
        // ServerBridgeModule.updateGroupUrl.
        @ReactMethod
        fun updateGroupUrl(
            groupId: String,
            urlId: String,
            url: String?,
            timeoutMs: Double,
            priority: Double,
            linkedServerUrlId: String?,
            promise: Promise,
        ) {
            scope.launch {
                runCatching {
                    externalMetadataServer.group(groupId).updateUrl(
                        urlId,
                        url,
                        timeoutMs.takeIf { it >= 0 }?.toInt(),
                        priority.takeIf { it >= 0 }?.toInt(),
                        linkedServerUrlId,
                    )
                }.resolveOrReject(promise, "UPDATE_GROUP_URL_ERROR") { it.toWritableMap() }
            }
        }

        @ReactMethod
        fun removeGroupUrl(
            groupId: String,
            urlId: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching { externalMetadataServer.group(groupId).removeUrl(urlId) }.resolveOrReject(promise, "REMOVE_GROUP_URL_ERROR")
            }
        }

        @ReactMethod
        fun validateGroupUrls(
            groupId: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching { externalMetadataServer.group(groupId).validateUrls() }
                    .resolveOrReject(promise, "VALIDATE_GROUP_URLS_ERROR") { it.toWritableMap() }
            }
        }

        @ReactMethod
        fun testGroupUrl(
            groupId: String,
            url: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching { externalMetadataServer.group(groupId).testUrl(url) }
                    .resolveOrReject(promise, "TEST_GROUP_URL_ERROR") { it.toWritableMap() }
            }
        }

        @ReactMethod
        fun getGroupActive(
            groupId: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching {
                    externalMetadataServer
                        .group(
                            groupId,
                        ).getActive()
                }.resolveOrReject(promise, "GET_GROUP_ACTIVE_ERROR") { it?.toWritableMap() }
            }
        }

        // ── active group ─────────────────────────────────────────────────────

        @ReactMethod
        fun setActiveGroup(
            groupId: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching { externalMetadataServer.setActiveGroup(groupId) }.resolveOrReject(promise, "SET_ACTIVE_GROUP_ERROR")
            }
        }

        @ReactMethod
        fun reauthenticateActiveGroup(
            groupId: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching { externalMetadataServer.reauthenticateActiveGroup(groupId) }.resolveOrReject(promise, "REAUTHENTICATE_ERROR")
            }
        }

        @ReactMethod
        fun getActiveGroupId(promise: Promise) {
            runCatching { externalMetadataServer.getActiveGroupId() }.resolveOrReject(promise, "GET_ACTIVE_GROUP_ID_ERROR")
        }

        @ReactMethod
        fun getActive(promise: Promise) {
            scope.launch {
                runCatching { externalMetadataServer.getActive() }.resolveOrReject(promise, "GET_ACTIVE_ERROR") { it?.toWritableMap() }
            }
        }

        @ReactMethod
        fun getActiveInfo(promise: Promise) {
            scope.launch {
                runCatching { externalMetadataServer.getActiveInfo() }.resolveOrReject(
                    promise,
                    "GET_ACTIVE_INFO_ERROR",
                ) { it?.toWritableMap() }
            }
        }

        @ReactMethod
        fun getActiveGroupInfo(promise: Promise) {
            scope.launch {
                runCatching { externalMetadataServer.getActiveGroupInfo() }.resolveOrReject(
                    promise,
                    "GET_ACTIVE_GROUP_INFO_ERROR",
                ) { it?.toWritableMap() }
            }
        }

        // ── match (singular) — namespaced, not syncMatch/syncMatches (one letter apart, easy to
        // misread); mirrors ExternalMetadataServer.match's own 4 resolution shapes ───────────────

        @ReactMethod
        fun matchSync(
            seriesId: String,
            seriesName: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching { externalMetadataServer.match.sync(ExternalMetadataSeriesRef(seriesId, seriesName), server).data }
                    .resolveOrReject(promise, "MATCH_SYNC_ERROR") { it?.toWritableMap() }
            }
        }

        @ReactMethod
        fun matchSyncByGroup(
            groupId: String,
            seriesId: String,
            seriesName: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching { externalMetadataServer.match.syncByGroup(groupId, ExternalMetadataSeriesRef(seriesId, seriesName)).data }
                    .resolveOrReject(promise, "MATCH_SYNC_ERROR") { it?.toWritableMap() }
            }
        }

        @ReactMethod
        fun matchSyncByServerId(
            kavitaServerGroupId: String,
            seriesId: String,
            seriesName: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching {
                    externalMetadataServer.match
                        .syncByServerId(
                            kavitaServerGroupId,
                            ExternalMetadataSeriesRef(seriesId, seriesName),
                        ).data
                }.resolveOrReject(promise, "MATCH_SYNC_ERROR") { it?.toWritableMap() }
            }
        }

        @ReactMethod
        fun matchSyncByServerUrl(
            kavitaUrl: String,
            seriesId: String,
            seriesName: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching {
                    externalMetadataServer.match
                        .syncByServerUrl(
                            server,
                            kavitaUrl,
                            ExternalMetadataSeriesRef(seriesId, seriesName),
                        ).data
                }.resolveOrReject(promise, "MATCH_SYNC_ERROR") { it?.toWritableMap() }
            }
        }

        // ── matches (batch) — same 4 shapes as match, one series list instead of one series ─────

        @ReactMethod
        fun matchesSync(
            seriesIds: ReadableArray,
            seriesNames: ReadableArray,
            promise: Promise,
        ) {
            scope.launch {
                val series = seriesIds.toSeriesRefs(seriesNames)
                runCatching { externalMetadataServer.matches.sync(series, server).data }
                    .resolveOrReject(promise, "MATCHES_SYNC_ERROR") { it.toMatchesWritableArray() }
            }
        }

        @ReactMethod
        fun matchesSyncByGroup(
            groupId: String,
            seriesIds: ReadableArray,
            seriesNames: ReadableArray,
            promise: Promise,
        ) {
            scope.launch {
                val series = seriesIds.toSeriesRefs(seriesNames)
                runCatching { externalMetadataServer.matches.syncByGroup(groupId, series).data }
                    .resolveOrReject(promise, "MATCHES_SYNC_ERROR") { it.toMatchesWritableArray() }
            }
        }

        @ReactMethod
        fun matchesSyncByServerId(
            kavitaServerGroupId: String,
            seriesIds: ReadableArray,
            seriesNames: ReadableArray,
            promise: Promise,
        ) {
            scope.launch {
                val series = seriesIds.toSeriesRefs(seriesNames)
                runCatching { externalMetadataServer.matches.syncByServerId(kavitaServerGroupId, series).data }
                    .resolveOrReject(promise, "MATCHES_SYNC_ERROR") { it.toMatchesWritableArray() }
            }
        }

        @ReactMethod
        fun matchesSyncByServerUrl(
            kavitaUrl: String,
            seriesIds: ReadableArray,
            seriesNames: ReadableArray,
            promise: Promise,
        ) {
            scope.launch {
                val series = seriesIds.toSeriesRefs(seriesNames)
                runCatching { externalMetadataServer.matches.syncByServerUrl(server, kavitaUrl, series).data }
                    .resolveOrReject(promise, "MATCHES_SYNC_ERROR") { it.toMatchesWritableArray() }
            }
        }

        private fun ReadableArray.toSeriesRefs(names: ReadableArray): List<ExternalMetadataSeriesRef> = (0 until size()).map { ExternalMetadataSeriesRef(id = getString(it), name = names.getString(it)) }

        // ── mapping: ExternalMetadataServer data classes → WritableMap/WritableArray ────────────

        private fun ProviderInfo.toWritableMap() =
            Arguments.createMap().apply {
                putString("id", id)
                putString("displayName", displayName)
                putString("version", version)
                putString("defaultHealthCheckPath", defaultHealthCheckPath)
                putArray(
                    "credentialFields",
                    Arguments.createArray().also { arr ->
                        credentialFields.forEach { field ->
                            arr.pushMap(
                                Arguments.createMap().apply {
                                    putString("name", field.name)
                                    putString("label", field.label)
                                    putString("type", field.type)
                                    putBoolean("required", field.required)
                                },
                            )
                        }
                    },
                )
            }

        private fun List<ProviderInfo>.toProvidersWritableArray() =
            Arguments.createArray().also { arr ->
                forEach {
                    arr.pushMap(it.toWritableMap())
                }
            }

        private fun UrlProbeResult.toWritableMap() =
            Arguments.createMap().apply {
                putString("url", url)
                putBoolean("ok", ok)
                val statusCode = status
                if (statusCode != null) putInt("status", statusCode) else putNull("status")
                putDouble("elapsedMs", elapsedMs.toDouble())
            }

        private fun ExternalMetadataGroupInfo.toWritableMap() =
            Arguments.createMap().apply {
                putString("id", id)
                putString("name", name)
                putString("providerId", providerId)
                putString("credentialsJson", credentialsJson)
                putString("healthCheckPath", healthCheckPath)
                linkedServerGroupId?.let { putString("linkedServerGroupId", it) }
            }

        private fun List<ExternalMetadataGroupInfo>.toGroupsWritableArray() =
            Arguments.createArray().also { arr ->
                forEach {
                    arr.pushMap(it.toWritableMap())
                }
            }

        private fun ExternalMetadataUrlInfo.toWritableMap() =
            Arguments.createMap().apply {
                putString("id", id)
                putString("groupId", groupId)
                putString("url", url)
                putInt("timeoutMs", timeoutMs)
                putInt("priority", priority)
                linkedServerUrlId?.let { putString("linkedServerUrlId", it) }
            }

        private fun List<ExternalMetadataUrlInfo>.toUrlsWritableArray() =
            Arguments.createArray().also { arr ->
                forEach {
                    arr.pushMap(it.toWritableMap())
                }
            }

        private fun ExternalMetadataGroupFullInfo.toWritableMap() =
            Arguments.createMap().apply {
                putString("id", id)
                putString("name", name)
                putString("providerId", providerId)
                putArray("urls", urls.toUrlsWritableArray())
            }

        private fun ExternalMetadataActiveInfo.toWritableMap() =
            Arguments.createMap().apply {
                putString("groupId", groupId)
                putString("groupName", groupName)
                putString("providerId", providerId)
                putString("urlId", urlId)
                putString("url", url)
                putInt("timeoutMs", timeoutMs)
                putInt("priority", priority)
            }

        private fun ExternalMetadataMatch.toWritableMap() =
            Arguments.createMap().apply {
                putString("seriesId", seriesId)
                slug?.let { putString("slug", it) }
                putString("status", status)
                downloadedChapters?.let { putInt("downloadedChapters", it) }
                totalChapters?.let { putInt("totalChapters", it) }
                latestChapterLabel?.let { putString("latestChapterLabel", it) }
                putBoolean("hasErrors", hasErrors)
            }

        // Positional — index i is series[i]'s match, or a bridge-side null when ExternalMetadataMatch
        // itself was null (no match found for that series). Never filters entries out — losing an
        // index would break the series↔match correlation on the RN side.
        private fun List<ExternalMetadataMatch?>.toMatchesWritableArray() =
            Arguments.createArray().also { arr ->
                forEach { match ->
                    if (match !=
                        null
                    ) {
                        arr.pushMap(match.toWritableMap())
                    } else {
                        arr.pushNull()
                    }
                }
            }
    }
