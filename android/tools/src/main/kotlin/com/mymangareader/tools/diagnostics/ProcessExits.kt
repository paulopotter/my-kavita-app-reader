package com.mymangareader.tools.diagnostics

import android.app.ActivityManager
import android.app.ApplicationExitInfo
import android.content.Context
import android.os.Build
import java.io.File

/** What Android recorded about how a previous run of this app's process ended. */
data class ProcessExit(
    val timestampMs: Long,
    val reason: String,
    val description: String?,
    val status: Int,
    val importance: Int,
    val pssKb: Long,
    val rssKb: Long,
)

/** One readable log line for [exit]. */
fun formatProcessExit(exit: ProcessExit): String =
    buildString {
        append("previous process ended: reason=${exit.reason}")
        exit.description?.takeIf { it.isNotBlank() }?.let { append(" description=\"$it\"") }
        append(" status=${exit.status} importance=${exit.importance} pss=${exit.pssKb}KB rss=${exit.rssKb}KB")
    }

/** Only the exits newer than [lastRecordedMs], oldest first — so an exit is logged exactly once. */
fun newExits(
    exits: List<ProcessExit>,
    lastRecordedMs: Long,
): List<ProcessExit> = exits.filter { it.timestampMs > lastRecordedMs }.sortedBy { it.timestampMs }

internal fun exitReasonName(reason: Int): String =
    when (reason) {
        ApplicationExitInfo.REASON_ANR -> "ANR"
        ApplicationExitInfo.REASON_CRASH -> "CRASH"
        ApplicationExitInfo.REASON_CRASH_NATIVE -> "CRASH_NATIVE"
        ApplicationExitInfo.REASON_DEPENDENCY_DIED -> "DEPENDENCY_DIED"
        ApplicationExitInfo.REASON_EXCESSIVE_RESOURCE_USAGE -> "EXCESSIVE_RESOURCE_USAGE"
        ApplicationExitInfo.REASON_EXIT_SELF -> "EXIT_SELF"
        ApplicationExitInfo.REASON_FREEZER -> "FREEZER"
        ApplicationExitInfo.REASON_INITIALIZATION_FAILURE -> "INITIALIZATION_FAILURE"
        ApplicationExitInfo.REASON_LOW_MEMORY -> "LOW_MEMORY"
        ApplicationExitInfo.REASON_OTHER -> "OTHER"
        ApplicationExitInfo.REASON_PERMISSION_CHANGE -> "PERMISSION_CHANGE"
        ApplicationExitInfo.REASON_SIGNALED -> "SIGNALED"
        ApplicationExitInfo.REASON_USER_REQUESTED -> "USER_REQUESTED"
        ApplicationExitInfo.REASON_USER_STOPPED -> "USER_STOPPED"
        else -> "UNKNOWN($reason)"
    }

/**
 * Writes the exits Android recorded since the last run (Android 11+; older versions keep no such
 * history, so this is a no-op there) into [DiagnosticLog]. This is what tells a rare crash with the
 * app closed apart from the system killing it for memory (`LOW_MEMORY`), a native crash
 * (`CRASH_NATIVE`), or a plain swipe-away (`USER_REQUESTED`).
 */
object ProcessExits {
    private const val MARKER_FILE = "last-exit-ts"
    private const val MAX_ENTRIES = 10

    fun recordPrevious(
        context: Context,
        directory: File,
    ) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return
        runCatching {
            val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val exits =
                manager
                    .getHistoricalProcessExitReasons(context.packageName, 0, MAX_ENTRIES)
                    .map {
                        ProcessExit(
                            timestampMs = it.timestamp,
                            reason = exitReasonName(it.reason),
                            description = it.description,
                            status = it.status,
                            importance = it.importance,
                            pssKb = it.pss,
                            rssKb = it.rss,
                        )
                    }
            val marker = File(directory, MARKER_FILE)
            val last = marker.takeIf { it.exists() }?.readText()?.trim()?.toLongOrNull() ?: 0L
            val fresh = newExits(exits, last)
            fresh.forEach { DiagnosticLog.event("EXIT", formatProcessExit(it), nowMs = it.timestampMs) }
            fresh.maxOfOrNull { it.timestampMs }?.let { marker.writeText(it.toString()) }
        }
    }
}
