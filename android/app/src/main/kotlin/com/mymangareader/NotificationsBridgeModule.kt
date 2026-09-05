package com.mymangareader

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

private const val EVENT_NEW_NOTIFICATION_RECEIVED = "newNotificationReceived"

/**
 * RN bridge for `:notifications` — minimal for now (Plan 008 Task 005): only emits
 * [EVENT_NEW_NOTIFICATION_RECEIVED] so a future in-app banner has something to listen to once
 * built. No `@ReactMethod` yet — those (groups/toggle/history CRUD) land in Task 006/007, on this
 * same module, same idiom as [OtaEventBridge]'s own static-instance registration.
 */
class NotificationsBridgeModule(
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {
    override fun getName(): String = "NotificationsBridgeModule"

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
    }
}
