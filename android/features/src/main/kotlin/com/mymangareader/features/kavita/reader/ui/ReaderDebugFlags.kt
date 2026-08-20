package com.mymangareader.features.kavita.reader.ui

/**
 * Kill switch for the reader's verbose diagnostic logcat output under the "CoilDiagnostic" tag —
 * instrumentation added while debugging scroll-offset/fraction and page-decode bugs (see
 * ReaderPageList.kt's compute* functions and SafeBitmapDecoder.kt). Off by default so production
 * builds don't pay per-scroll-tick/per-decode logging overhead; flip on on-device (e.g. via a
 * debug menu or adb) only when actively diagnosing a scroll/progress/decode bug.
 *
 * Only gates Log.d/Log.w (routine trace output). Log.e calls under the same tag stay
 * unconditional on purpose — those mark actual failures (bad bitmap bounds, a decode throwing,
 * an image request erroring out) that should always reach logcat regardless of this flag.
 */
object ReaderDebugFlags {
    var verboseScrollLogging: Boolean = false

    // inline so the message lambda is inlined at the call site instead of allocated as a
    // Function0 object on every invocation — this runs on the scroll hot path, so a non-inline
    // version would allocate-then-discard a closure per tick even with the flag off.
    inline fun d(tag: String, message: () -> String) {
        if (verboseScrollLogging) android.util.Log.d(tag, message())
    }

    inline fun w(tag: String, message: () -> String) {
        if (verboseScrollLogging) android.util.Log.w(tag, message())
    }
}
