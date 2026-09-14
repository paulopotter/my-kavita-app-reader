package com.mymangareader

import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NotificationDisplayTest {
    private val context = ApplicationProvider.getApplicationContext<android.content.Context>()

    // ── notificationId ── derived from the history row's own fresh id (a UUID per batch), never
    // from the serial's id — see NotificationDisplay's own doc on why multiple pending
    // notifications for the same serial can now coexist in the tray.

    @Test
    fun `notificationId e estavel para o mesmo historyId`() {
        assertEquals(NotificationDisplay.notificationId("h1"), NotificationDisplay.notificationId("h1"))
    }

    @Test
    fun `notificationId difere entre historyId diferentes`() {
        assertNotEquals(NotificationDisplay.notificationId("h1"), NotificationDisplay.notificationId("h2"))
    }

    // ── buildBody — os 3 casos do README ──

    @Test
    fun `buildBody com 1 capitulo numerado`() {
        val body = NotificationDisplay.buildBody(context, chapterIds = listOf("101"), chapterNumbers = listOf("1120"))

        assertEquals(context.getString(R.string.notification_new_chapter_numbered, "1120"), body)
    }

    @Test
    fun `buildBody com 1 capitulo sem numero conhecido`() {
        val body = NotificationDisplay.buildBody(context, chapterIds = listOf("101"), chapterNumbers = null)

        assertEquals(context.getString(R.string.notification_new_chapter_unnumbered), body)
    }

    @Test
    fun `buildBody com N capitulos nunca lista os numeros individuais`() {
        val body =
            NotificationDisplay.buildBody(
                context,
                chapterIds = listOf("101", "102", "103"),
                chapterNumbers = listOf("1120", "1121", "1122"),
            )

        assertEquals(context.getString(R.string.notification_new_chapters_batch, 3), body)
        assertEquals(false, body.contains("1120"))
    }

    @Test
    fun `buildBody com listas vazias cai no caso sem numero`() {
        val body = NotificationDisplay.buildBody(context, chapterIds = emptyList(), chapterNumbers = emptyList())

        assertEquals(context.getString(R.string.notification_new_chapter_unnumbered), body)
    }

    @Test
    fun `buildBody com chapterIds e chapterNumbers ambos nulos cai no caso sem numero`() {
        val body = NotificationDisplay.buildBody(context, chapterIds = null, chapterNumbers = null)

        assertEquals(context.getString(R.string.notification_new_chapter_unnumbered), body)
    }

    @Test
    fun `buildBody com chapterIds e chapterNumbers de tamanhos diferentes usa a contagem de chapterIds`() {
        // Defensive handling — a mismatched-length payload is never expected per the contract, but
        // this must not crash: chapterIds' own count wins for the N>1 decision.
        val body =
            NotificationDisplay.buildBody(
                context,
                chapterIds = listOf("101", "102"),
                chapterNumbers = listOf("1120"),
            )

        assertEquals(context.getString(R.string.notification_new_chapters_batch, 2), body)
    }
}
