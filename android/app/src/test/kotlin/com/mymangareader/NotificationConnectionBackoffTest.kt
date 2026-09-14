package com.mymangareader

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationConnectionBackoffTest {
    @Test
    fun `primeira tentativa usa o delay inicial`() {
        assertEquals(5_000L, notificationResolveRetryDelayMs(attempt = 0))
    }

    @Test
    fun `delay dobra a cada tentativa`() {
        assertEquals(5_000L, notificationResolveRetryDelayMs(0))
        assertEquals(10_000L, notificationResolveRetryDelayMs(1))
        assertEquals(20_000L, notificationResolveRetryDelayMs(2))
        assertEquals(40_000L, notificationResolveRetryDelayMs(3))
    }

    @Test
    fun `delay nunca ultrapassa uma hora`() {
        val oneHourMs = 60 * 60 * 1_000L
        assertEquals(oneHourMs, notificationResolveRetryDelayMs(attempt = 20))
        assertEquals(oneHourMs, notificationResolveRetryDelayMs(attempt = 100))
    }

    @Test
    fun `delay e sempre positivo e cresce monotonicamente ate o teto`() {
        var previous = 0L
        for (attempt in 0..15) {
            val current = notificationResolveRetryDelayMs(attempt)
            assertTrue(current >= previous)
            previous = current
        }
    }
}
