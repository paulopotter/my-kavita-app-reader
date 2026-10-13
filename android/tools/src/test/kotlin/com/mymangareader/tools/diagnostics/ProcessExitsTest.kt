package com.mymangareader.tools.diagnostics

import android.app.ApplicationExitInfo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ProcessExitsTest {
    private fun exit(
        ts: Long,
        reason: String = "LOW_MEMORY",
        description: String? = null,
    ) = ProcessExit(ts, reason, description, status = 0, importance = 400, pssKb = 100, rssKb = 200)

    @Test
    fun `a line says why the process ended and how big it was`() {
        val line = formatProcessExit(exit(1, "LOW_MEMORY", "lmkd kill"))

        assertTrue(line.contains("reason=LOW_MEMORY"))
        assertTrue(line.contains("description=\"lmkd kill\""))
        assertTrue(line.contains("importance=400"))
        assertTrue(line.contains("pss=100KB rss=200KB"))
    }

    @Test
    fun `a blank description is left out`() {
        assertEquals(false, formatProcessExit(exit(1, description = "  ")).contains("description"))
        assertEquals(false, formatProcessExit(exit(1, description = null)).contains("description"))
    }

    @Test
    fun `only exits newer than the last recorded are returned, oldest first`() {
        val exits = listOf(exit(30), exit(10), exit(20))

        assertEquals(listOf(20L, 30L), newExits(exits, lastRecordedMs = 10).map { it.timestampMs })
        assertEquals(emptyList<ProcessExit>(), newExits(exits, lastRecordedMs = 30))
        assertEquals(listOf(10L, 20L, 30L), newExits(exits, lastRecordedMs = 0).map { it.timestampMs })
    }

    @Test
    fun `reason codes map to readable names`() {
        assertEquals("CRASH_NATIVE", exitReasonName(ApplicationExitInfo.REASON_CRASH_NATIVE))
        assertEquals("LOW_MEMORY", exitReasonName(ApplicationExitInfo.REASON_LOW_MEMORY))
        assertEquals("USER_REQUESTED", exitReasonName(ApplicationExitInfo.REASON_USER_REQUESTED))
        assertEquals("UNKNOWN(999)", exitReasonName(999))
    }
}

class MemorySnapshotTest {
    @Test
    fun `memory is reported in megabytes for the java heap, native heap and pss`() {
        val line = formatMemory(javaUsedBytes = 52L * 1024 * 1024, javaMaxBytes = 256L * 1024 * 1024, nativeAllocatedBytes = 300L * 1024 * 1024, pssKb = 600L * 1024)

        assertEquals("javaHeap=52MB/256MB nativeHeap=300MB pss=600MB", line)
    }

    @Test
    fun `describeMemory returns a line in the same shape`() {
        assertTrue(Regex("""javaHeap=\d+MB/\d+MB nativeHeap=\d+MB pss=\d+MB""").matches(describeMemory()))
    }
}
