package com.mymangareader.cache

// SQLite hands rows to Android through a CursorWindow of about 2 MB, and a row that does not fit
// can be WRITTEN but never READ back: every query that touches it throws "Row too big to fit into
// CursorWindow" — one oversized cache row then breaks every list read of its slice and every
// single-key read of itself (a series with thousands of chapters did exactly that). A cache can
// always be rebuilt from the source, so the rule is: never persist a value that could not be read
// back, and treat a row that already cannot be read as a miss.
//
// Kept well under 2 MB: the window also holds the row's other columns and its own bookkeeping.
const val CACHE_MAX_VALUE_BYTES = 1_500_000

// A UTF-8 character takes at most 3 bytes in the BMP, so a value of up to a third of the limit in
// chars cannot exceed it and skips the byte count.
internal fun String.exceedsCacheRowLimit(): Boolean = length > CACHE_MAX_VALUE_BYTES / 3 && toByteArray(Charsets.UTF_8).size > CACHE_MAX_VALUE_BYTES

// Android raises SQLiteBlobTooBigException (API 27+) or a plain SQLiteException with this message
// (earlier releases, and the logged form) — matched by name and text so it needs neither API level
// nor an android.jar class on the JVM test classpath.
internal fun Throwable.isCacheRowTooBig(): Boolean = this::class.simpleName == "SQLiteBlobTooBigException" || message?.contains("Row too big", ignoreCase = true) == true
