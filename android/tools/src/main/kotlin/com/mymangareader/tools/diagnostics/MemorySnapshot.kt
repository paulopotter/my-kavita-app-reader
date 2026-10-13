package com.mymangareader.tools.diagnostics

import android.os.Debug

private const val MB = 1024L * 1024

/** One readable line about the process's memory, for the periodic sample in [DiagnosticLog]. */
fun formatMemory(
    javaUsedBytes: Long,
    javaMaxBytes: Long,
    nativeAllocatedBytes: Long,
    pssKb: Long,
): String = "javaHeap=${javaUsedBytes / MB}MB/${javaMaxBytes / MB}MB nativeHeap=${nativeAllocatedBytes / MB}MB pss=${pssKb / 1024}MB"

/** The current figures. Native heap matters here: decoded bitmaps live there, not in the Java heap. */
fun describeMemory(): String {
    val runtime = Runtime.getRuntime()
    return formatMemory(
        javaUsedBytes = runtime.totalMemory() - runtime.freeMemory(),
        javaMaxBytes = runtime.maxMemory(),
        nativeAllocatedBytes = Debug.getNativeHeapAllocatedSize(),
        pssKb = Debug.getPss(),
    )
}
