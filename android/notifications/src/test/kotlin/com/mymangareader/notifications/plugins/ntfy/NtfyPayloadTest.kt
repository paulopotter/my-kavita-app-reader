package com.mymangareader.notifications.plugins.ntfy

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

private val json = Json { ignoreUnknownKeys = true }

class NtfyPayloadTest {
    @Test
    fun `decodifica o envelope ntfy com event message`() {
        val frame = """{"id":"abc","time":1,"event":"message","topic":"my-topic","message":"[]"}"""

        val envelope = json.decodeFromString<NtfyEnvelope>(frame)

        assertEquals("message", envelope.event)
        assertEquals("[]", envelope.message)
    }

    @Test
    fun `decodifica o envelope ntfy de handshake open sem message`() {
        val frame = """{"id":"abc","time":1,"event":"open","topic":"my-topic"}"""

        val envelope = json.decodeFromString<NtfyEnvelope>(frame)

        assertEquals("open", envelope.event)
        assertEquals("", envelope.message)
    }

    @Test
    fun `mapeia NtfyEventDto completo para RawNotificationEvent`() {
        val dto =
            NtfyEventDto(
                seriesId = "42",
                seriesName = "One Piece",
                chapterIds = listOf("101", "102"),
                chapterNumbers = listOf("1120", "1121"),
                detectedAtMs = 1_000L,
            )

        val event = dto.toRawNotificationEvent()

        assertEquals("42", event.seriesId)
        assertEquals("One Piece", event.seriesName)
        assertEquals(listOf("101", "102"), event.chapterIds)
        assertEquals(listOf("1120", "1121"), event.chapterNumbers)
        assertEquals(1_000L, event.detectedAtMs)
    }

    @Test
    fun `mapeia NtfyEventDto sem seriesId, chapterIds e chapterNumbers`() {
        val dto = NtfyEventDto(seriesName = "One Piece", detectedAtMs = 1_000L)

        val event = dto.toRawNotificationEvent()

        assertNull(event.seriesId)
        assertNull(event.chapterIds)
        assertNull(event.chapterNumbers)
    }

    @Test
    fun `mapeia NtfyEventDto com apenas chapterNumbers presente`() {
        val dto = NtfyEventDto(seriesName = "One Piece", chapterNumbers = listOf("1120"), detectedAtMs = 1_000L)

        val event = dto.toRawNotificationEvent()

        assertNull(event.chapterIds)
        assertEquals(listOf("1120"), event.chapterNumbers)
    }

    @Test
    fun `decodifica um array com N elementos do payload interno`() {
        val message =
            """[{"seriesName":"A","detectedAtMs":1},{"seriesId":"2","seriesName":"B","detectedAtMs":2}]"""

        val events = json.decodeFromString<List<NtfyEventDto>>(message)

        assertEquals(2, events.size)
        assertEquals("A", events[0].seriesName)
        assertEquals("2", events[1].seriesId)
    }

    @Test
    fun `decodifica um array vazio do payload interno`() {
        val events = json.decodeFromString<List<NtfyEventDto>>("[]")

        assertEquals(emptyList<NtfyEventDto>(), events)
    }
}
