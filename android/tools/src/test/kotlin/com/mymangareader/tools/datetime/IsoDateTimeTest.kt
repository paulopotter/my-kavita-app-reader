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
}
