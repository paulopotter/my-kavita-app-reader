package com.mymangareader.notifications

import org.junit.Assert.assertEquals
import org.junit.Test

private fun resolvedEvent(
    chapterIds: List<String>? = null,
    chapterNumbers: List<String>? = null,
) = ResolvedSeriesEvent(
    seriesId = "1",
    seriesName = "One Piece",
    chapterIds = chapterIds,
    chapterNumbers = chapterNumbers,
    detectedAtMs = 1_000L,
)

class NotificationHistoryExplodeTest {
    @Test
    fun `1 chapterId com 1 chapterNumber vira exatamente 1 item, os dois preenchidos`() {
        val items = resolvedEvent(chapterIds = listOf("101"), chapterNumbers = listOf("1120")).explodeToHistoryItems()

        assertEquals(listOf(NewNotificationHistoryItem("1", "One Piece", "101", "1120", 1_000L)), items)
    }

    @Test
    fun `N chapterIds com N chapterNumbers do mesmo tamanho vira N itens, casados por posicao`() {
        val items =
            resolvedEvent(chapterIds = listOf("101", "102", "103"), chapterNumbers = listOf("1120", "1121", "1122"))
                .explodeToHistoryItems()

        assertEquals(3, items.size)
        assertEquals(listOf("101", "102", "103"), items.map { it.chapterId })
        assertEquals(listOf("1120", "1121", "1122"), items.map { it.chapterNumber })
    }

    @Test
    fun `chapterIds maior que chapterNumbers preenche o resto sem numero, nunca descarta um id`() {
        val items = resolvedEvent(chapterIds = listOf("101", "102", "103"), chapterNumbers = listOf("1120")).explodeToHistoryItems()

        assertEquals(3, items.size)
        assertEquals(listOf("101", "102", "103"), items.map { it.chapterId })
        assertEquals(listOf("1120", null, null), items.map { it.chapterNumber })
    }

    @Test
    fun `chapterNumbers maior que chapterIds preenche o resto sem id, nunca descarta um numero`() {
        val items = resolvedEvent(chapterIds = listOf("101"), chapterNumbers = listOf("1120", "1121", "1122")).explodeToHistoryItems()

        assertEquals(3, items.size)
        assertEquals(listOf("101", null, null), items.map { it.chapterId })
        assertEquals(listOf("1120", "1121", "1122"), items.map { it.chapterNumber })
    }

    @Test
    fun `apenas chapterIds, sem chapterNumbers, vira N itens so com id`() {
        val items = resolvedEvent(chapterIds = listOf("101", "102"), chapterNumbers = null).explodeToHistoryItems()

        assertEquals(2, items.size)
        assertEquals(listOf("101", "102"), items.map { it.chapterId })
        assertEquals(listOf(null, null), items.map { it.chapterNumber })
    }

    @Test
    fun `apenas chapterNumbers, sem chapterIds, vira N itens so com numero`() {
        val items = resolvedEvent(chapterIds = null, chapterNumbers = listOf("1120", "1121")).explodeToHistoryItems()

        assertEquals(2, items.size)
        assertEquals(listOf(null, null), items.map { it.chapterId })
        assertEquals(listOf("1120", "1121"), items.map { it.chapterNumber })
    }

    @Test
    fun `nem chapterIds nem chapterNumbers vira exatamente 1 item, sem nenhum dos dois`() {
        val items = resolvedEvent(chapterIds = null, chapterNumbers = null).explodeToHistoryItems()

        assertEquals(listOf(NewNotificationHistoryItem("1", "One Piece", null, null, 1_000L)), items)
    }

    @Test
    fun `listas vazias (nao null) sao tratadas como ausentes, 1 item sem detalhe`() {
        val items = resolvedEvent(chapterIds = emptyList(), chapterNumbers = emptyList()).explodeToHistoryItems()

        assertEquals(listOf(NewNotificationHistoryItem("1", "One Piece", null, null, 1_000L)), items)
    }
}
