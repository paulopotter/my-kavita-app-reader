package com.mymangareader.tools.diagnostics

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class DiagnosticLogTest {
    @get:Rule
    val tmp = TemporaryFolder()

    private lateinit var dir: File

    @Before
    fun setUp() {
        dir = tmp.newFolder("diag")
        DiagnosticLog.init(dir)
    }

    @After
    fun tearDown() {
        DiagnosticLog.clear()
    }

    @Test
    fun `a line is appended with a newline and read back`() {
        DiagnosticLog.append("hello")
        DiagnosticLog.append("world")

        assertEquals("hello\nworld\n", DiagnosticLog.readAll())
    }

    @Test
    fun `an event carries a timestamp and its tag`() {
        DiagnosticLog.event("Memory", "heap=10MB", nowMs = 0L)

        val line = DiagnosticLog.readAll()
        assertTrue(line.contains("[Memory] heap=10MB"))
        assertTrue(Regex("""^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} """).containsMatchIn(line))
    }

    @Test
    fun `a crash records the thread and the stack trace`() {
        DiagnosticLog.crash(Thread.currentThread(), IllegalStateException("boom"))

        val text = DiagnosticLog.readAll()
        assertTrue(text.contains("[CRASH]"))
        assertTrue(text.contains("IllegalStateException: boom"))
        assertTrue(text.contains("at com.mymangareader.tools.diagnostics.DiagnosticLogTest"))
    }

    @Test
    fun `secrets are redacted before they reach the file`() {
        DiagnosticLog.append("GET http://h/api/reader/image?chapterId=1&apiKey=SUPERSECRET&page=2")

        val text = DiagnosticLog.readAll()
        assertFalse(text.contains("SUPERSECRET"))
        assertTrue(text.contains("apiKey=***&page=2"))
        assertFalse(File(dir, DiagnosticLog.FILE_NAME).readText().contains("SUPERSECRET"))
    }

    @Test
    fun `rotation keeps the previous generation and starts a fresh file`() {
        DiagnosticLog.init(dir, maxBytes = 100)
        repeat(30) { DiagnosticLog.append("line number $it") } // ~15 bytes each → several rotations

        assertTrue(File(dir, DiagnosticLog.PREVIOUS_FILE_NAME).exists())
        assertTrue(File(dir, DiagnosticLog.FILE_NAME).length() <= 100)
        assertTrue(DiagnosticLog.sizeBytes() <= 200)
        // the newest line survives, the oldest rotated out
        val text = DiagnosticLog.readAll()
        assertTrue(text.contains("line number 29"))
        assertFalse(text.contains("line number 0\n"))
    }

    @Test
    fun `readAll lists the previous generation before the current one`() {
        DiagnosticLog.init(dir, maxBytes = 40)
        DiagnosticLog.append("first-first-first-first")
        DiagnosticLog.append("second-second-second-second") // forces a rotation

        val text = DiagnosticLog.readAll()
        assertTrue(text.indexOf("first") < text.indexOf("second"))
    }

    @Test
    fun `clear removes both files and starts over`() {
        DiagnosticLog.append("something")
        DiagnosticLog.clear()

        assertEquals("", DiagnosticLog.readAll())
        assertEquals(0L, DiagnosticLog.sizeBytes())
        DiagnosticLog.append("again")
        assertEquals("again\n", DiagnosticLog.readAll())
    }

    @Test
    fun `an existing file is continued after a re-init, not truncated`() {
        DiagnosticLog.append("kept")

        DiagnosticLog.init(dir)
        DiagnosticLog.append("added")

        assertEquals("kept\nadded\n", DiagnosticLog.readAll())
    }

    @Test
    fun `redactSecrets handles urls, json and bearer headers`() {
        assertEquals("a?apiKey=***&b=1", redactSecrets("a?apiKey=abc123&b=1"))
        assertEquals("{\"apiKey\":\"***\",\"x\":1}", redactSecrets("{\"apiKey\":\"abc123\",\"x\":1}"))
        assertEquals("Authorization: Bearer ***", redactSecrets("Authorization: Bearer eyJhbGciOi.abc-def_ghi"))
        assertEquals("token=*** ok", redactSecrets("token=xyz ok"))
        assertEquals("nothing to hide", redactSecrets("nothing to hide"))
    }
}
