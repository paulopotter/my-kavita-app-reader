package com.mymangareader.tools.datetime

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class IsoDateTimeTest {

    @Test
    fun `parses a Kavita-style ISO date-time with 7-digit fraction as UTC`() {
        val result = parseIsoUtcToEpochMs("2026-07-30T02:06:35.6950261")

        assertEquals(1785377195695L, result)
    }

    @Test
    fun `parses a date-time with no fractional seconds`() {
        val result = parseIsoUtcToEpochMs("2026-01-01T00:00:00")

        assertEquals(1767225600000L, result)
    }

    @Test
    fun `returns null for a null input`() {
        assertNull(parseIsoUtcToEpochMs(null))
    }

    @Test
    fun `returns null for an unparsable string instead of throwing`() {
        assertNull(parseIsoUtcToEpochMs("not-a-date"))
    }

    @Test
    fun `returns null for a blank string`() {
        assertNull(parseIsoUtcToEpochMs(""))
    }

    // ── ensureIsoUtc — format fix only, stays a String ──────────────────────

    @Test
    fun `ensureIsoUtc adds Z and clamps a 7-digit fraction on a zone-less value`() {
        assertEquals("2026-07-30T02:06:35.695Z", ensureIsoUtc("2026-07-30T02:06:35.6950261"))
    }

    @Test
    fun `ensureIsoUtc pads a short fraction to milliseconds`() {
        assertEquals("2026-07-30T02:06:35.900Z", ensureIsoUtc("2026-07-30T02:06:35.9"))
    }

    @Test
    fun `ensureIsoUtc adds 000Z when there is no fraction`() {
        assertEquals("2026-01-01T00:00:00.000Z", ensureIsoUtc("2026-01-01T00:00:00"))
    }

    @Test
    fun `ensureIsoUtc trusts a value that already ends in Z`() {
        assertEquals("2026-07-30T02:06:35.695Z", ensureIsoUtc("2026-07-30T02:06:35.695Z"))
    }

    @Test
    fun `ensureIsoUtc trusts a value that already carries an offset`() {
        assertEquals("2026-07-30T02:06:35-03:00", ensureIsoUtc("2026-07-30T02:06:35-03:00"))
    }

    @Test
    fun `ensureIsoUtc returns null for null, blank and unrecognized shapes`() {
        assertNull(ensureIsoUtc(null))
        assertNull(ensureIsoUtc("   "))
        assertNull(ensureIsoUtc("30/07/2026"))
    }
}
