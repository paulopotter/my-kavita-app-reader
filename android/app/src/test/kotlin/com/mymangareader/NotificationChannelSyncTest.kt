package com.mymangareader

import android.app.NotificationManager
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class NotificationChannelSyncTest {
    private lateinit var context: android.content.Context
    private lateinit var sync: NotificationChannelSync

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        sync = NotificationChannelSync(context)
    }

    private fun manager() = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as NotificationManager

    @Test
    fun `ensureChannelsCreated cria os dois canais`() {
        sync.ensureChannelsCreated()

        assertTrue(manager().getNotificationChannel(CHANNEL_NEW_CHAPTERS) != null)
        assertTrue(manager().getNotificationChannel(CHANNEL_CONNECTION) != null)
    }

    @Test
    fun `ensureChannelsCreated e idempotente, chamar duas vezes nao falha`() {
        sync.ensureChannelsCreated()
        sync.ensureChannelsCreated()

        assertTrue(manager().getNotificationChannel(CHANNEL_NEW_CHAPTERS) != null)
    }

    @Test
    fun `isEnabled e true por padrao apos criar os canais`() {
        sync.ensureChannelsCreated()

        assertTrue(sync.isEnabled())
    }

    @Test
    fun `isEnabled reflete o canal desabilitado diretamente pelo sistema`() {
        sync.ensureChannelsCreated()
        manager().getNotificationChannel(CHANNEL_NEW_CHAPTERS)?.importance = NotificationManager.IMPORTANCE_NONE

        assertFalse(sync.isEnabled())
    }

    @Test
    fun `isEnabled e false quando as notificacoes do app estao desabilitadas globalmente`() {
        sync.ensureChannelsCreated()
        shadowOf(manager()).setNotificationsEnabled(false)

        assertFalse(sync.isEnabled())
    }

    @Test
    fun `openChannelSettings dispara um Intent para a tela do canal`() {
        sync.ensureChannelsCreated()

        sync.openChannelSettings()

        val shadowApplication = shadowOf(ApplicationProvider.getApplicationContext<android.app.Application>())
        val intent = shadowApplication.nextStartedActivity
        assertEquals(android.provider.Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS, intent.action)
        assertEquals(context.packageName, intent.getStringExtra(android.provider.Settings.EXTRA_APP_PACKAGE))
        assertEquals(CHANNEL_NEW_CHAPTERS, intent.getStringExtra(android.provider.Settings.EXTRA_CHANNEL_ID))
    }
}
