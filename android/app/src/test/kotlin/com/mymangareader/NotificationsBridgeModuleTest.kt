package com.mymangareader

import com.facebook.react.bridge.ReactApplicationContext
import com.mymangareader.notifications.NotificationConnectionGate
import com.mymangareader.notifications.NotificationGroupResolver
import com.mymangareader.notifications.Notifications
import com.mymangareader.preferences.Preferences
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mockito.kotlin.mock

// Every @ReactMethod here ends up calling Arguments.createMap() (via the *WritableMap() mappers),
// which needs the native reactnativejni lib — not available under a plain JVM test, same
// limitation already documented in CacheBridgeModuleTest.kt/DigestBridgeModuleTest.kt. So the only
// thing verifiable here is wiring — getName() — with resolve/reject behavior covered by the
// real-device smoke test.
class NotificationsBridgeModuleTest {
    @Test
    fun `getName retorna NotificationsBridgeModule`() {
        val module =
            NotificationsBridgeModule(
                mock<Notifications>(),
                mock<Preferences>(),
                mock<NotificationChannelSync>(),
                mock<NotificationConnectionGate>(),
                mock<NotificationGroupResolver>(),
                mock<ReactApplicationContext>(),
            )

        assertEquals("NotificationsBridgeModule", module.name)
    }
}
