package com.mymangareader.tools.diagnostics

import java.io.BufferedWriter
import java.io.File
import java.io.FileWriter
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * A small local file the app keeps its own trouble in, so a rare crash (often with the app already
 * closed, when nobody is watching logcat) can be read afterwards. Nothing leaves the device: it is
 * only ever read over adb or exported by the user from the debug screen.
 *
 * Two files — the current one and the previous generation — each capped at [maxBytes], so the
 * total never exceeds twice that. Every line is run through [redactSecrets] first: an API key must
 * never land in a file the user may attach to a bug report.
 */
object DiagnosticLog {
    const val FILE_NAME = "app-diagnostics.log"
    const val PREVIOUS_FILE_NAME = "app-diagnostics.1.log"
    const val DEFAULT_MAX_BYTES = 512L * 1024

    private val lock = Any()
    private var directory: File? = null
    private var maxBytes: Long = DEFAULT_MAX_BYTES
    private var writer: BufferedWriter? = null
    private var written: Long = 0

    fun init(
        directory: File,
        maxBytes: Long = DEFAULT_MAX_BYTES,
    ) = synchronized(lock) {
        closeWriter()
        directory.mkdirs()
        this.directory = directory
        this.maxBytes = maxBytes
        written = File(directory, FILE_NAME).takeIf { it.exists() }?.length() ?: 0
    }

    /** A timestamped event written by the app itself (as opposed to a captured logcat line). */
    fun event(
        tag: String,
        message: String,
        nowMs: Long = System.currentTimeMillis(),
    ) = append("${formatTime(nowMs)} [$tag] $message")

    /** An uncaught exception, with its stack trace — written before the process dies. */
    fun crash(
        thread: Thread,
        throwable: Throwable,
        nowMs: Long = System.currentTimeMillis(),
    ) {
        val trace = StringWriter().also { throwable.printStackTrace(PrintWriter(it)) }.toString().trimEnd()
        append("${formatTime(nowMs)} [CRASH] uncaught exception on thread \"${thread.name}\"\n$trace")
    }

    /** One raw line (e.g. from logcat), redacted, with a trailing newline. No-op before [init]. */
    fun append(line: String) {
        synchronized(lock) {
            val dir = directory ?: return
            val text = redactSecrets(line).trimEnd('\n') + "\n"
            val bytes = text.toByteArray(Charsets.UTF_8).size
            if (written + bytes > maxBytes) rotate(dir)
            val out = writer ?: BufferedWriter(FileWriter(File(dir, FILE_NAME), true)).also { writer = it }
            out.write(text)
            out.flush()
            written += bytes
        }
    }

    /** Previous generation first, then the current one: the order the lines were written in. */
    fun readAll(): String =
        synchronized(lock) {
            val dir = directory ?: return ""
            writer?.flush()
            listOf(PREVIOUS_FILE_NAME, FILE_NAME)
                .map { File(dir, it) }
                .filter { it.exists() }
                .joinToString("") { it.readText() }
        }

    fun currentFile(): File? = synchronized(lock) { directory?.let { File(it, FILE_NAME) } }

    fun sizeBytes(): Long =
        synchronized(lock) {
            val dir = directory ?: return 0
            writer?.flush()
            listOf(PREVIOUS_FILE_NAME, FILE_NAME).sumOf { File(dir, it).takeIf { f -> f.exists() }?.length() ?: 0 }
        }

    fun clear() =
        synchronized(lock) {
            closeWriter()
            val dir = directory ?: return@synchronized
            listOf(PREVIOUS_FILE_NAME, FILE_NAME).forEach { File(dir, it).delete() }
            written = 0
        }

    private fun rotate(dir: File) {
        closeWriter()
        val current = File(dir, FILE_NAME)
        val previous = File(dir, PREVIOUS_FILE_NAME)
        previous.delete()
        current.renameTo(previous)
        written = 0
    }

    private fun closeWriter() {
        runCatching { writer?.close() }
        writer = null
    }

    private fun formatTime(ms: Long): String = SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US).format(Date(ms))
}

private val SECRET_PATTERNS =
    listOf(
        // key=value in URLs, headers, query strings
        Regex("""(?i)((?:api[_-]?key|token|password|secret|authorization)=)[^&\s"']+""") to "$1***",
        // "apiKey":"…" in JSON
        Regex("""(?i)("(?:api[_-]?key|token|password|secret|authorization)"\s*:\s*")[^"]*(")""") to "$1***$2",
        // Authorization: Bearer …
        Regex("""(?i)(bearer\s+)[A-Za-z0-9._~+/=-]+""") to "$1***",
    )

/** [text] with API keys, tokens, passwords and bearer credentials replaced by `***`. */
fun redactSecrets(text: String): String = SECRET_PATTERNS.fold(text) { acc, (pattern, replacement) -> pattern.replace(acc, replacement) }
