package com.mymangareader

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.mymangareader.notifications.NewNotificationGroup
import com.mymangareader.notifications.NewNotificationUrl
import com.mymangareader.notifications.NotificationConnectionGate
import com.mymangareader.notifications.NotificationPreferenceKeys
import com.mymangareader.notifications.Notifications
import com.mymangareader.preferences.Preferences
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

private const val EVENT_NEW_NOTIFICATION_RECEIVED = "newNotificationReceived"
private const val EVENT_UNREAD_COUNT_CHANGED = "unreadCountChanged"

/**
 * RN bridge for `:notifications` — groups/URL CRUD, the channel-backed enabled state, scope/
 * grouping/retention preferences, and history CRUD. Every group/toggle write re-evaluates
 * [NotificationConnectionGate.shouldConnect] and starts/stops [NotificationConnectionService]
 * accordingly — the one place that decision is made from the RN-writable side (the service itself
 * never polls for this, per Task 006's own design).
 *
 * Never adds business logic of its own: every decision belongs in `Notifications`/
 * `NotificationChannelSync`/`Preferences`, this only translates their results to/from the RN
 * bridge shape — same discipline as every other `*BridgeModule` in this codebase. Constructed by
 * hand in `AppReactPackage` (same idiom as `ExternalMetadataBridgeModule`/`ServerBridgeModule`),
 * not `@Inject`ed directly — `AppReactPackage` itself is what Hilt injects into.
 */
class NotificationsBridgeModule(
    private val notifications: Notifications,
    private val preferences: Preferences,
    private val notificationChannelSync: NotificationChannelSync,
    private val connectionGate: NotificationConnectionGate,
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {
    override fun getName(): String = "NotificationsBridgeModule"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // ── channel-backed enabled state ─────────────────────────────────────

    @ReactMethod
    fun isChannelEnabled(promise: Promise) {
        runCatching { notificationChannelSync.isEnabled() }.resolveOrReject(promise, "IS_CHANNEL_ENABLED_ERROR")
    }

    @ReactMethod
    fun openChannelSettings(promise: Promise) {
        runCatching { notificationChannelSync.openChannelSettings() }.resolveOrReject(promise, "OPEN_CHANNEL_SETTINGS_ERROR")
    }

    // ── groups ────────────────────────────────────────────────────────────

    @ReactMethod
    fun listGroups(promise: Promise) {
        scope.launch {
            runCatching { notifications.groups.list() }.resolveOrReject(promise, "LIST_GROUPS_ERROR") { it.toGroupsWritableArray() }
        }
    }

    @ReactMethod
    fun listGroupUrls(
        groupId: String,
        promise: Promise,
    ) {
        scope.launch {
            runCatching { notifications.group(groupId).getUrls() }.resolveOrReject(promise, "LIST_GROUP_URLS_ERROR") { it.toUrlsWritableArray() }
        }
    }

    @ReactMethod
    fun addGroup(
        name: String,
        providerId: String,
        topic: String,
        linkedServerGroupId: String?,
        promise: Promise,
    ) {
        scope.launch {
            runCatching { notifications.groups.add(NewNotificationGroup(name, providerId, topic, linkedServerGroupId)) }
                .onSuccess { reevaluateConnection() }
                .resolveOrReject(promise, "ADD_GROUP_ERROR") { it.toWritableMap() }
        }
    }

    @ReactMethod
    fun removeGroup(
        groupId: String,
        promise: Promise,
    ) {
        scope.launch {
            runCatching { notifications.groups.remove(groupId) }
                .onSuccess { reevaluateConnection() }
                .resolveOrReject(promise, "REMOVE_GROUP_ERROR")
        }
    }

    @ReactMethod
    fun addGroupUrl(
        groupId: String,
        url: String,
        timeoutMs: Int,
        priority: Int,
        promise: Promise,
    ) {
        scope.launch {
            runCatching { notifications.group(groupId).addUrl(NewNotificationUrl(url, timeoutMs, priority)) }
                .onSuccess { reevaluateConnection() }
                .resolveOrReject(promise, "ADD_GROUP_URL_ERROR") { it.toWritableMap() }
        }
    }

    @ReactMethod
    fun removeGroupUrl(
        groupId: String,
        urlId: String,
        promise: Promise,
    ) {
        scope.launch {
            runCatching { notifications.group(groupId).removeUrl(urlId) }
                .onSuccess { reevaluateConnection() }
                .resolveOrReject(promise, "REMOVE_GROUP_URL_ERROR")
        }
    }

    // ── scope/grouping/retention preferences ─────────────────────────────

    @ReactMethod
    fun getScopeAll(promise: Promise) {
        scope.launch {
            runCatching { readBooleanFlag(NotificationPreferenceKeys.SCOPE_ALL) }.resolveOrReject(promise, "GET_SCOPE_ALL_ERROR")
        }
    }

    @ReactMethod
    fun setScopeAll(
        enabled: Boolean,
        promise: Promise,
    ) {
        scope.launch {
            runCatching { writeBooleanFlag(NotificationPreferenceKeys.SCOPE_ALL, enabled) }.resolveOrReject(promise, "SET_SCOPE_ALL_ERROR")
        }
    }

    @ReactMethod
    fun getScopeFollowedOnly(promise: Promise) {
        scope.launch {
            runCatching { readBooleanFlag(NotificationPreferenceKeys.SCOPE_FOLLOWED_ONLY) }
                .resolveOrReject(promise, "GET_SCOPE_FOLLOWED_ONLY_ERROR")
        }
    }

    @ReactMethod
    fun setScopeFollowedOnly(
        enabled: Boolean,
        promise: Promise,
    ) {
        scope.launch {
            runCatching { writeBooleanFlag(NotificationPreferenceKeys.SCOPE_FOLLOWED_ONLY, enabled) }
                .resolveOrReject(promise, "SET_SCOPE_FOLLOWED_ONLY_ERROR")
        }
    }

    @ReactMethod
    fun getGroupAcrossSeries(promise: Promise) {
        scope.launch {
            runCatching { readBooleanFlag(NotificationPreferenceKeys.GROUP_ACROSS_SERIES) }
                .resolveOrReject(promise, "GET_GROUP_ACROSS_SERIES_ERROR")
        }
    }

    @ReactMethod
    fun setGroupAcrossSeries(
        enabled: Boolean,
        promise: Promise,
    ) {
        scope.launch {
            runCatching { writeBooleanFlag(NotificationPreferenceKeys.GROUP_ACROSS_SERIES, enabled) }
                .resolveOrReject(promise, "SET_GROUP_ACROSS_SERIES_ERROR")
        }
    }

    @ReactMethod
    fun getRetentionDays(promise: Promise) {
        scope.launch {
            runCatching { preferences.get(NotificationPreferenceKeys.RETENTION_DAYS)?.value?.toIntOrNull() }
                .resolveOrReject(promise, "GET_RETENTION_DAYS_ERROR")
        }
    }

    @ReactMethod
    fun setRetentionDays(
        days: Int,
        promise: Promise,
    ) {
        scope.launch {
            runCatching {
                preferences.put(NotificationPreferenceKeys.RETENTION_DAYS, days.toString(), domain = NotificationPreferenceKeys.DOMAIN)
            }.resolveOrReject(promise, "SET_RETENTION_DAYS_ERROR")
        }
    }

    // ── history ───────────────────────────────────────────────────────────

    @ReactMethod
    fun listHistory(promise: Promise) {
        scope.launch {
            runCatching { notifications.history.listAll() }.resolveOrReject(promise, "LIST_HISTORY_ERROR") { it.toHistoryWritableArray() }
        }
    }

    @ReactMethod
    fun markHistoryRead(
        id: String,
        promise: Promise,
    ) {
        scope.launch {
            runCatching { notifications.history.markRead(id) }
                .onSuccess { emitUnreadCountChanged() }
                .resolveOrReject(promise, "MARK_HISTORY_READ_ERROR")
        }
    }

    @ReactMethod
    fun markAllHistoryRead(promise: Promise) {
        scope.launch {
            runCatching { notifications.history.markAllRead() }
                .onSuccess { emitUnreadCountChanged() }
                .resolveOrReject(promise, "MARK_ALL_HISTORY_READ_ERROR")
        }
    }

    @ReactMethod
    fun deleteHistoryItem(
        id: String,
        promise: Promise,
    ) {
        scope.launch {
            runCatching { notifications.history.delete(id) }
                .onSuccess { emitUnreadCountChanged() }
                .resolveOrReject(promise, "DELETE_HISTORY_ITEM_ERROR")
        }
    }

    @ReactMethod
    fun unreadCount(promise: Promise) {
        scope.launch {
            runCatching { notifications.history.countUnread() }.resolveOrReject(promise, "UNREAD_COUNT_ERROR")
        }
    }

    // ── RN event emitter contract ─────────────────────────────────────────

    @ReactMethod
    fun addListener(eventName: String) = Unit

    @ReactMethod
    fun removeListeners(count: Int) = Unit

    // ── helpers ───────────────────────────────────────────────────────────

    private suspend fun readBooleanFlag(key: String): Boolean = preferences.get(key)?.value == "true"

    private suspend fun writeBooleanFlag(
        key: String,
        enabled: Boolean,
    ) {
        preferences.put(key, enabled.toString(), domain = NotificationPreferenceKeys.DOMAIN)
    }

    private suspend fun reevaluateConnection() {
        if (connectionGate.shouldConnect()) {
            NotificationConnectionService.start(reactApplicationContext)
        } else {
            NotificationConnectionService.stop(reactApplicationContext)
        }
    }

    private suspend fun emitUnreadCountChanged() {
        notifyUnreadCountChanged(notifications.history.countUnread())
    }

    companion object {
        private var instance: NotificationsBridgeModule? = null

        fun register(bridge: NotificationsBridgeModule) {
            instance = bridge
        }

        // Called by NotificationDisplay when the app is in foreground — no system-tray
        // notification is posted in that case, only history/badge is updated (README's "in-app
        // banner instead of the system tray while the app is open" rule) plus this event, so a
        // future banner UI has a signal to react to.
        fun notifyNewNotificationReceived() {
            val context = instance?.reactApplicationContext ?: return
            context.emitEvent(EVENT_NEW_NOTIFICATION_RECEIVED, null)
        }

        fun notifyUnreadCountChanged(count: Int) {
            val context = instance?.reactApplicationContext ?: return
            context.emitEvent(EVENT_UNREAD_COUNT_CHANGED, count.toDouble())
        }
    }
}
