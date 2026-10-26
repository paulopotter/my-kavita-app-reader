package com.mymangareader

import android.content.ComponentName
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NotificationConnectionServiceStartTest {
    private class Refusing(base: Context) : ContextWrapper(base) {
        override fun startService(service: Intent?): ComponentName = throw IllegalStateException("app is in background")
    }

    private class Counting(base: Context) : ContextWrapper(base) {
        var started = 0

        override fun startService(service: Intent?): ComponentName {
            started++
            return ComponentName(this, NotificationConnectionService::class.java)
        }
    }

    @Test
    fun `tryStart starts the service when Android allows it`() {
        val context = Counting(ApplicationProvider.getApplicationContext())

        assertTrue(NotificationConnectionService.tryStart(context))
        assertEquals(1, context.started)
    }

    @Test
    fun `tryStart says no, instead of crashing, when Android refuses a start from the background`() {
        assertFalse(NotificationConnectionService.tryStart(Refusing(ApplicationProvider.getApplicationContext())))
    }

    @Test
    fun `attemptForegroundStart is true when startForeground goes through`() {
        assertTrue(NotificationConnectionService.attemptForegroundStart { })
    }

    @Test
    fun `attemptForegroundStart is false, not a crash, when Android refuses startForeground`() {
        assertFalse(NotificationConnectionService.attemptForegroundStart { throw IllegalStateException("not allowed") })
    }

    @Test
    fun `attemptForegroundStart is false when the foreground service permission is missing`() {
        assertFalse(NotificationConnectionService.attemptForegroundStart { throw SecurityException("missing permission") })
    }
}
