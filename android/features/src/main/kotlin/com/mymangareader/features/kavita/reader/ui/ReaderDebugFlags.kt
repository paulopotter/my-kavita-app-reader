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

    const val DEFAULT_PAGE_BUDGET_MB = 48
    const val MIN_PAGE_BUDGET_MB = 16
    const val MAX_PAGE_BUDGET_MB = 96 // Android refuses to draw a bitmap above ~100MB

    // Largest decoded page bitmap SafeBitmapDecoder produces (taller pages are scaled down to fit).
    // Read at every decode, so changing it from the debug menu applies to pages decoded afterwards —
    // no rebuild; pages already in the image cache keep the size they were decoded at. Always kept
    // inside [MIN_PAGE_BUDGET_MB, MAX_PAGE_BUDGET_MB], whatever is stored or sent.
    @Volatile
    var pageBudgetMb: Int = DEFAULT_PAGE_BUDGET_MB
        set(value) {
            field = value.coerceIn(MIN_PAGE_BUDGET_MB, MAX_PAGE_BUDGET_MB)
        }

    val pageBudgetBytes: Long get() = pageBudgetMb * 1024L * 1024L

    // A stored preference value → MB, or null when it isn't a usable number.
    fun parsePageBudgetMb(raw: String?): Int? = raw?.trim()?.toIntOrNull()

    // inline so the message lambda is inlined at the call site instead of allocated as a
    // Function0 object on every invocation — this runs on the scroll hot path, so a non-inline
    // version would allocate-then-discard a closure per tick even with the flag off.
    inline fun d(
        tag: String,
        message: () -> String,
    ) {
        if (verboseScrollLogging) android.util.Log.d(tag, message())
    }

    inline fun w(
        tag: String,
        message: () -> String,
    ) {
        if (verboseScrollLogging) android.util.Log.w(tag, message())
    }
}
