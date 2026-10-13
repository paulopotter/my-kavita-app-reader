package com.mymangareader.features.kavita.reader.ui

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class ReaderDebugFlagsTest {
    @After
    fun tearDown() {
        ReaderDebugFlags.verboseScrollLogging = false
        ReaderDebugFlags.pageBudgetMb = ReaderDebugFlags.DEFAULT_PAGE_BUDGET_MB
    }

    @Test
    fun `page budget defaults to 48MB and exposes it in bytes`() {
        assertEquals(48, ReaderDebugFlags.pageBudgetMb)
        assertEquals(48L * 1024 * 1024, ReaderDebugFlags.pageBudgetBytes)
    }

    @Test
    fun `page budget is clamped into the allowed range`() {
        ReaderDebugFlags.pageBudgetMb = 500
        assertEquals(ReaderDebugFlags.MAX_PAGE_BUDGET_MB, ReaderDebugFlags.pageBudgetMb)

        ReaderDebugFlags.pageBudgetMb = 1
        assertEquals(ReaderDebugFlags.MIN_PAGE_BUDGET_MB, ReaderDebugFlags.pageBudgetMb)

        ReaderDebugFlags.pageBudgetMb = 64
        assertEquals(64, ReaderDebugFlags.pageBudgetMb)
    }

    @Test
    fun `a stored budget is parsed or rejected`() {
        assertEquals(64, ReaderDebugFlags.parsePageBudgetMb(" 64 "))
        assertEquals(null, ReaderDebugFlags.parsePageBudgetMb("abc"))
        assertEquals(null, ReaderDebugFlags.parsePageBudgetMb(null))
    }

    @Test
    fun `d nao avalia a mensagem quando a flag esta desligada`() {
        var evaluated = false

        ReaderDebugFlags.d("tag") {
            evaluated = true
            "message"
        }

        assertFalse(evaluated)
    }

    @Test
    fun `w nao avalia a mensagem quando a flag esta desligada`() {
        var evaluated = false

        ReaderDebugFlags.w("tag") {
            evaluated = true
            "message"
        }

        assertFalse(evaluated)
    }
}
