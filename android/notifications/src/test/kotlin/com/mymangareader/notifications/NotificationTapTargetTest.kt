package com.mymangareader.notifications

import org.junit.Assert.assertEquals
import org.junit.Test

private fun resolvedEvent(
    seriesId: String = "1",
    chapterIds: List<String>? = null,
) = ResolvedSeriesEvent(
    seriesId = seriesId,
    seriesName = "One Piece",
    chapterIds = chapterIds,
    chapterNumbers = null,
    detectedAtMs = 1_000L,
)

class NotificationTapTargetTest {
    @Test
    fun `exatamente 1 chapterId conhecido resolve para Chapter`() {
        val target = resolvedEvent(seriesId = "42", chapterIds = listOf("101")).tapTarget()

        assertEquals(NotificationTapTarget.Chapter(serialId = "42", chapterId = "101"), target)
    }

    @Test
    fun `N chapterIds resolve para Serial, nunca escolhe um capitulo`() {
        val target = resolvedEvent(seriesId = "42", chapterIds = listOf("101", "102")).tapTarget()

        assertEquals(NotificationTapTarget.Serial(serialId = "42"), target)
    }

    @Test
    fun `chapterIds ausente resolve para Serial`() {
        val target = resolvedEvent(seriesId = "42", chapterIds = null).tapTarget()

        assertEquals(NotificationTapTarget.Serial(serialId = "42"), target)
    }

    @Test
    fun `chapterIds vazio resolve para Serial`() {
        val target = resolvedEvent(seriesId = "42", chapterIds = emptyList()).tapTarget()

        assertEquals(NotificationTapTarget.Serial(serialId = "42"), target)
    }
}
