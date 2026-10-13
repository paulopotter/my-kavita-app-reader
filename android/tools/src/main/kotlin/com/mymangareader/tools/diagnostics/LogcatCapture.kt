package com.mymangareader.tools.diagnostics

import android.os.Process

/**
 * Streams this app's own logcat output into [DiagnosticLog] for as long as the process lives.
 *
 * An app can always read its own process's log (no special permission), and doing it this way
 * captures the warnings and errors of EVERY library — Coil, OkHttp, React Native, Room — without
 * wrapping each `Log` call. Warnings and above for everything, plus the info level for the tags
 * this app's own diagnostics use. The child `logcat` dies with the app process.
 */
object LogcatCapture {
    // Info-level tags worth keeping: the ones the app's own diagnostics write.
    internal val INFO_TAGS = listOf("UrlSelector", "CacheRetention", "CoilDiagnostic", "NotificationConnService", "Choreographer")

    private val lock = Any()
    private var started = false

    internal fun command(pid: Int): List<String> = listOf("logcat", "-v", "threadtime", "--pid=$pid", "*:W") + INFO_TAGS.map { "$it:I" }

    // logcat prints "--------- beginning of main" banners; they say nothing about the app.
    internal fun isNoise(line: String): Boolean = line.startsWith("--------- beginning of")

    fun start(pid: Int = Process.myPid()) {
        synchronized(lock) {
            if (started) return
            started = true
        }
        val thread =
            Thread({
                runCatching {
                    val child = ProcessBuilder(command(pid)).redirectErrorStream(true).start()
                    child.inputStream.bufferedReader().useLines { lines -> lines.filterNot(::isNoise).forEach { DiagnosticLog.append(it) } }
                }
            }, "DiagnosticLog-logcat")
        thread.isDaemon = true
        thread.start()
    }
}
