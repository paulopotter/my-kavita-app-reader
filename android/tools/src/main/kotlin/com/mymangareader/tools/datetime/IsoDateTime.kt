package com.mymangareader.tools.datetime

import java.time.LocalDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeParseException

// Kavita's *Utc fields (e.g. createdUtc, lastReadingProgressUtc) serialize as an ISO-8601
// local date-time with no timezone offset and a variable-precision fraction of a second (e.g.
// "2026-07-30T02:06:35.6950261", 7 digits — more than java.time's Instant.parse() accepts, which
// also requires a trailing "Z"). The field name's "Utc" suffix is the only signal the timezone
// is UTC — Kavita never includes it in the value itself, so this parser assumes UTC rather than
// requiring a caller to supply one. Returns null instead of throwing on anything unparsable —
// treated as R10 category 2 (call succeeded, this field just has no usable value), never an error.
fun parseIsoUtcToEpochMs(value: String?): Long? {
    if (value == null) return null
    return try {
        LocalDateTime.parse(value).toInstant(ZoneOffset.UTC).toEpochMilli()
    } catch (e: DateTimeParseException) {
        null
    }
}
