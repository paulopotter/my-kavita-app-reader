package com.mymangareader.features.kavita.reader.ui

import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Test

class ReaderDebugFlagsTest {

    @After
    fun tearDown() {
        ReaderDebugFlags.verboseScrollLogging = false
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
