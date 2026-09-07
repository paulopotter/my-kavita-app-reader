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
    fun `mapeia NtfyEventDto com slug presente`() {
        val dto = NtfyEventDto(seriesName = "One Piece", slug = "one-piece", detectedAtMs = 1_000L)

        val event = dto.toRawNotificationEvent()

        assertEquals("one-piece", event.slug)
    }

    @Test
    fun `mapeia NtfyEventDto sem slug`() {
        val dto = NtfyEventDto(seriesName = "One Piece", detectedAtMs = 1_000L)

        val event = dto.toRawNotificationEvent()

        assertNull(event.slug)
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

    // ── decodeNtfyEvents — detecção estrutural do contrato (array puro vs. envelope legado) ──

    @Test
    fun `decodeNtfyEvents aceita o contrato documentado, um array puro`() {
        val message = """[{"seriesName":"A","detectedAtMs":1},{"seriesId":"2","seriesName":"B","detectedAtMs":2}]"""

        val events = decodeNtfyEvents(json, message)

        assertEquals(2, events.size)
        assertEquals("A", events[0].seriesName)
        assertEquals("2", events[1].seriesId)
    }

    @Test
    fun `decodeNtfyEvents aceita o contrato legado, um objeto com a chave events`() {
        val message = """{"events":[{"seriesName":"A","detectedAtMs":1},{"seriesId":"2","seriesName":"B","detectedAtMs":2}]}"""

        val events = decodeNtfyEvents(json, message)

        assertEquals(2, events.size)
        assertEquals("A", events[0].seriesName)
        assertEquals("2", events[1].seriesId)
    }

    @Test
    fun `decodeNtfyEvents propaga slug em ambos os contratos`() {
        val arrayMessage = """[{"seriesName":"A","slug":"a-slug","detectedAtMs":1}]"""
        val envelopeMessage = """{"events":[{"seriesName":"A","slug":"a-slug","detectedAtMs":1}]}"""

        assertEquals("a-slug", decodeNtfyEvents(json, arrayMessage).single().slug)
        assertEquals("a-slug", decodeNtfyEvents(json, envelopeMessage).single().slug)
    }

    @Test
    fun `decodeNtfyEvents retorna lista vazia para um objeto sem a chave events`() {
        val message = """{"seriesName":"A","detectedAtMs":1}"""

        val events = decodeNtfyEvents(json, message)

        assertEquals(emptyList<NtfyEventDto>(), events)
    }

    @Test
    fun `decodeNtfyEvents retorna lista vazia para json invalido`() {
        val events = decodeNtfyEvents(json, "not even json")

        assertEquals(emptyList<NtfyEventDto>(), events)
    }

    @Test
    fun `decodeNtfyEvents retorna lista vazia para um numero ou string solta`() {
        assertEquals(emptyList<NtfyEventDto>(), decodeNtfyEvents(json, "42"))
        assertEquals(emptyList<NtfyEventDto>(), decodeNtfyEvents(json, "\"oops\""))
    }
}
