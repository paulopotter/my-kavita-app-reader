package com.mymangareader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.mymangareader.server.NewServerGroup
import com.mymangareader.server.NewServerUrl
import com.mymangareader.server.ProviderInfo
import com.mymangareader.server.SerialData
import com.mymangareader.server.SerialListData
import com.mymangareader.server.Server
import com.mymangareader.server.ServerGroupInfo
import com.mymangareader.server.ServerUrlInfo
import com.mymangareader.server.plugins.PluginChapter
import com.mymangareader.server.plugins.PluginPageDimension
import com.mymangareader.server.plugins.PluginProgress
import com.mymangareader.tools.network.UrlProbeResult
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

// RN→Kotlin bridge for the :server module's Server facade — one @ReactMethod per Server
// operation, each just runCatching + resolveOrReject (see ReactBridgeSupport.kt). Never adds
// logic of its own: any validation/orchestration decision belongs in Server, not here. Every
// method throws-to-Promise-rejection instead of a Result shape, since Server itself always
// throws on failure (this module's job is only to translate that into the RN bridge's
// Promise.reject contract, per mechanism 1 in Task 013 — RN→Kotlin is always Promise-based).
@Singleton
class ServerBridgeModule @Inject constructor(
    private val server: Server,
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "ServerBridgeModule"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // ── providers ────────────────────────────────────────────────────────

    @ReactMethod
    fun listProviders(promise: Promise) {
        runCatching { server.providers.list() }.resolveOrReject(promise, "LIST_PROVIDERS_ERROR") { it.toProvidersWritableArray() }
    }

    // ── groups ───────────────────────────────────────────────────────────

    @ReactMethod
    fun listGroups(promise: Promise) {
        scope.launch {
            runCatching { server.groups.list() }.resolveOrReject(promise, "LIST_GROUPS_ERROR") { it.toGroupsWritableArray() }
        }
    }

    @ReactMethod
    fun getGroup(groupId: String, promise: Promise) {
        scope.launch {
            runCatching { server.groups.get(groupId) }.resolveOrReject(promise, "GET_GROUP_ERROR") { it?.toWritableMap() }
        }
    }

    @ReactMethod
    fun addGroup(name: String, providerId: String, credentialsJson: String, healthCheckPath: String, promise: Promise) {
        scope.launch {
            runCatching { server.groups.add(NewServerGroup(name, providerId, credentialsJson, healthCheckPath)) }
                .resolveOrReject(promise, "ADD_GROUP_ERROR") { it.toWritableMap() }
        }
    }

    @ReactMethod
    fun updateGroup(groupId: String, name: String?, credentialsJson: String?, healthCheckPath: String?, promise: Promise) {
        scope.launch {
            runCatching { server.groups.update(groupId, name, credentialsJson, healthCheckPath) }
                .resolveOrReject(promise, "UPDATE_GROUP_ERROR") { it.toWritableMap() }
        }
    }

    @ReactMethod
    fun removeGroup(groupId: String, promise: Promise) {
        scope.launch {
            runCatching { server.groups.remove(groupId) }.resolveOrReject(promise, "REMOVE_GROUP_ERROR")
        }
    }

    // ── group(id) urls ───────────────────────────────────────────────────

    @ReactMethod
    fun getGroupUrls(groupId: String, promise: Promise) {
        scope.launch {
            runCatching { server.group(groupId).getUrls() }.resolveOrReject(promise, "GET_GROUP_URLS_ERROR") { it.toUrlsWritableArray() }
        }
    }

    @ReactMethod
    fun addGroupUrl(groupId: String, url: String, timeoutMs: Int, priority: Int, promise: Promise) {
        scope.launch {
            runCatching { server.group(groupId).addUrl(NewServerUrl(url, timeoutMs, priority)) }
                .resolveOrReject(promise, "ADD_GROUP_URL_ERROR") { it.toWritableMap() }
        }
    }

    @ReactMethod
    fun updateGroupUrl(groupId: String, urlId: String, url: String?, timeoutMs: Int?, priority: Int?, promise: Promise) {
        scope.launch {
            runCatching { server.group(groupId).updateUrl(urlId, url, timeoutMs, priority) }
                .resolveOrReject(promise, "UPDATE_GROUP_URL_ERROR") { it.toWritableMap() }
        }
    }

    @ReactMethod
    fun removeGroupUrl(groupId: String, urlId: String, promise: Promise) {
        scope.launch {
            runCatching { server.group(groupId).removeUrl(urlId) }.resolveOrReject(promise, "REMOVE_GROUP_URL_ERROR")
        }
    }

    @ReactMethod
    fun validateGroupUrls(groupId: String, promise: Promise) {
        scope.launch {
            runCatching { server.group(groupId).validateUrls() }
                .resolveOrReject(promise, "VALIDATE_GROUP_URLS_ERROR") { it.toWritableMap() }
        }
    }

    @ReactMethod
    fun testGroupUrl(groupId: String, url: String, promise: Promise) {
        scope.launch {
            runCatching { server.group(groupId).testUrl(url) }
                .resolveOrReject(promise, "TEST_GROUP_URL_ERROR") { it.toWritableMap() }
        }
    }

    @ReactMethod
    fun getGroupActive(groupId: String, promise: Promise) {
        scope.launch {
            runCatching { server.group(groupId).getActive() }
                .resolveOrReject(promise, "GET_GROUP_ACTIVE_ERROR") { it?.toWritableMap() }
        }
    }

    // ── active group ─────────────────────────────────────────────────────

    @ReactMethod
    fun setActiveGroup(groupId: String, promise: Promise) {
        scope.launch {
            runCatching { server.setActiveGroup(groupId) }.resolveOrReject(promise, "SET_ACTIVE_GROUP_ERROR")
        }
    }

    @ReactMethod
    fun reauthenticateActiveGroup(groupId: String, promise: Promise) {
        scope.launch {
            runCatching { server.reauthenticateActiveGroup(groupId) }.resolveOrReject(promise, "REAUTHENTICATE_ERROR")
        }
    }

    @ReactMethod
    fun getActiveGroupId(promise: Promise) {
        runCatching { server.getActiveGroupId() }.resolveOrReject(promise, "GET_ACTIVE_GROUP_ID_ERROR")
    }

    // ── content: serials ─────────────────────────────────────────────────

    @ReactMethod
    fun listSerials(promise: Promise) {
        scope.launch {
            runCatching { server.serials.list().data }
                .resolveOrReject(promise, "LIST_SERIALS_ERROR") { it.toWritableMap() }
        }
    }

    @ReactMethod
    fun getSerial(serialId: String, promise: Promise) {
        scope.launch {
            runCatching { server.serial(serialId).get().data }.resolveOrReject(promise, "GET_SERIAL_ERROR") { it.toWritableMap() }
        }
    }

    // ── content: chapters ────────────────────────────────────────────────

    @ReactMethod
    fun listChapters(serialId: String, promise: Promise) {
        scope.launch {
            runCatching { server.serial(serialId).chapters.list().data }
                .resolveOrReject(promise, "LIST_CHAPTERS_ERROR") { it.toChaptersWritableArray() }
        }
    }

    @ReactMethod
    fun setChaptersRead(serialId: String, isRead: Boolean, chapterIds: ReadableArray, promise: Promise) {
        scope.launch {
            val ids = (0 until chapterIds.size()).map { chapterIds.getString(it) }
            runCatching { server.serial(serialId).chapters.setRead(isRead, ids) }
                .resolveOrReject(promise, "SET_CHAPTERS_READ_ERROR")
        }
    }

    @ReactMethod
    fun getChapter(serialId: String, chapterId: String, promise: Promise) {
        scope.launch {
            runCatching { server.serial(serialId).chapter(chapterId).get().data }
                .resolveOrReject(promise, "GET_CHAPTER_ERROR") { it.toWritableMap() }
        }
    }

    @ReactMethod
    fun setChapterRead(serialId: String, chapterId: String, isRead: Boolean, promise: Promise) {
        scope.launch {
            runCatching { server.serial(serialId).chapter(chapterId).setRead(isRead) }
                .resolveOrReject(promise, "SET_CHAPTER_READ_ERROR")
        }
    }

    @ReactMethod
    fun getChapterProgress(serialId: String, chapterId: String, promise: Promise) {
        scope.launch {
            runCatching { server.serial(serialId).chapter(chapterId).getProgress().data }
                .resolveOrReject(promise, "GET_CHAPTER_PROGRESS_ERROR") { it?.toWritableMap() }
        }
    }

    @ReactMethod
    fun setChapterProgress(serialId: String, chapterId: String, pageIndex: Int, promise: Promise) {
        scope.launch {
            runCatching { server.serial(serialId).chapter(chapterId).setProgress(pageIndex) }
                .resolveOrReject(promise, "SET_CHAPTER_PROGRESS_ERROR")
        }
    }

    // ── content: pages ───────────────────────────────────────────────────

    @ReactMethod
    fun getPageDimensions(serialId: String, chapterId: String, pageIndex: Int, promise: Promise) {
        scope.launch {
            runCatching { server.serial(serialId).chapter(chapterId).page(pageIndex).getDimensions().data }
                .resolveOrReject(promise, "GET_PAGE_DIMENSIONS_ERROR") { it.toWritableMap() }
        }
    }

    @ReactMethod
    fun getPageUrl(serialId: String, chapterId: String, pageIndex: Int, promise: Promise) {
        scope.launch {
            runCatching { server.serial(serialId).chapter(chapterId).page(pageIndex).getUrl().data }
                .resolveOrReject(promise, "GET_PAGE_URL_ERROR")
        }
    }

    // ── mapping: Server data classes → WritableMap/WritableArray ────────────

    private fun ProviderInfo.toWritableMap() = Arguments.createMap().apply {
        putString("id", id)
        putString("displayName", displayName)
        putString("version", version)
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

    private fun List<ProviderInfo>.toProvidersWritableArray() = Arguments.createArray().also { arr -> forEach { arr.pushMap(it.toWritableMap()) } }

    private fun ServerGroupInfo.toWritableMap() = Arguments.createMap().apply {
        putString("id", id)
        putString("name", name)
        putString("providerId", providerId)
        putString("credentialsJson", credentialsJson)
        putString("healthCheckPath", healthCheckPath)
    }

    private fun List<ServerGroupInfo>.toGroupsWritableArray() = Arguments.createArray().also { arr -> forEach { arr.pushMap(it.toWritableMap()) } }

    private fun ServerUrlInfo.toWritableMap() = Arguments.createMap().apply {
        putString("id", id)
        putString("groupId", groupId)
        putString("url", url)
        putInt("timeoutMs", timeoutMs)
        putInt("priority", priority)
    }

    private fun List<ServerUrlInfo>.toUrlsWritableArray() = Arguments.createArray().also { arr -> forEach { arr.pushMap(it.toWritableMap()) } }

    private fun UrlProbeResult.toWritableMap() = Arguments.createMap().apply {
        putString("url", url)
        putBoolean("ok", ok)
        val statusCode = status
        if (statusCode != null) putInt("status", statusCode) else putNull("status")
        putDouble("elapsedMs", elapsedMs.toDouble())
    }

    private fun SerialData.toWritableMap() = Arguments.createMap().apply {
        putString("id", id)
        putString("name", name)
        putMap("coverImage", coverImage.toWritableMap())
        putInt("pagesRead", pagesRead)
        putInt("totalPages", totalPages)
        libraryId?.let { putString("libraryId", it) }
        libraryName?.let { putString("libraryName", it) }
        lastFolderScannedUtc?.let { putString("lastFolderScannedUtc", it) }
        lastChapterAddedUtc?.let { putString("lastChapterAddedUtc", it) }
        latestReadDateUtc?.let { putString("latestReadDateUtc", it) }
        originalName?.let { putString("originalName", it) }
        localizedName?.let { putString("localizedName", it) }
        sortName?.let { putString("sortName", it) }
        aniListId?.let { putInt("aniListId", it) }
        malId?.let { putDouble("malId", it.toDouble()) }
        primaryColor?.let { putString("primaryColor", it) }
        secondaryColor?.let { putString("secondaryColor", it) }
    }

    private fun List<SerialData>.toSerialsWritableArray() = Arguments.createArray().also { arr -> forEach { arr.pushMap(it.toWritableMap()) } }

    // SerialListData → { serials: [...] } — the object-wrapper shape the RN bridge type
    // (SerialListData) and SerialsService.list()'s `payload.serials` unwrap both expect.
    private fun SerialListData.toWritableMap() = Arguments.createMap().apply {
        putArray("serials", serials.toSerialsWritableArray())
    }

    private fun PluginChapter.toWritableMap() = Arguments.createMap().apply {
        putString("id", id)
        putString("title", title)
        number?.let { putString("number", it) }
        pageCount?.let { putInt("pageCount", it) }
        pagesRead?.let { putInt("pagesRead", it) }
        isSpecial?.let { putBoolean("isSpecial", it) }
        decimalNumber?.let { putDouble("decimalNumber", it) }
        specialLabel?.let { putString("specialLabel", it) }
        createdUtc?.let { putString("createdUtc", it) }
        lastReadingProgressUtc?.let { putString("lastReadingProgressUtc", it) }
        fileFormat?.let { putString("fileFormat", it) }
    }

    private fun List<PluginChapter>.toChaptersWritableArray() = Arguments.createArray().also { arr -> forEach { arr.pushMap(it.toWritableMap()) } }

    private fun PluginProgress.toWritableMap() = Arguments.createMap().apply {
        putInt("pageIndex", pageIndex)
        updatedAtUtc?.let { putString("updatedAtUtc", it) }
    }

    private fun PluginPageDimension.toWritableMap() = Arguments.createMap().apply {
        putInt("width", width)
        putInt("height", height)
    }
}
