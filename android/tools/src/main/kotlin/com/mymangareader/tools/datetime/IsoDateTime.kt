package com.mymangareader.tools.datetime

import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeParseException

// Kavita's *Utc fields (e.g. createdUtc, lastReadingProgressUtc) serialize as an ISO-8601
// local date-time with no timezone offset and a variable-precision fraction of a second (e.g.
// "2026-07-30T02:06:35.6950261", 7 digits — more than java.time's Instant.parse() accepts, which
// also requires a trailing "Z"). The field name's "Utc" suffix is the only signal the timezone
// is UTC — Kavita never includes it in the value itself, so this parser assumes UTC when the
// value carries no zone. Returns null instead of throwing on anything unparsable — treated as
// R10 category 2 (call succeeded, this field just has no usable value), never an error.
//
// It also accepts a value that DOES carry a zone (…Z or …±hh:mm) — e.g. one already run through
// [ensureIsoUtc] upstream (KavitaServerPlugin does this so the RN side can parse it). That path
// used to fail here (LocalDateTime.parse rejects a trailing "Z"), silently nulling every date and
// breaking the Library's "recently updated" sort — so both shapes are handled.
fun parseIsoUtcToEpochMs(value: String?): Long? {
    val trimmed = value?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    // Zoned form first (…Z or …±hh:mm) — what ensureIsoUtc produces.
    if (trimmed.endsWith("Z") || Regex("""[+-]\d{2}:?\d{2}$""").containsMatchIn(trimmed)) {
        return try {
            OffsetDateTime.parse(trimmed).toInstant().toEpochMilli()
        } catch (e: DateTimeParseException) {
            null
        }
    }
    // Zone-less local date-time — Kavita's raw *Utc shape; assume UTC.
    return try {
        LocalDateTime.parse(trimmed).toInstant(ZoneOffset.UTC).toEpochMilli()
    } catch (e: DateTimeParseException) {
        null
    }
}

private val ZONE_LESS_ISO = Regex("""^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$""")

// Corrects the FORMAT only of a Kavita *Utc string, leaving it a string: a zone-less ISO local
// date-time (see above) gets its fraction clamped to milliseconds and a trailing "Z" appended,
// so the RN side (which parses it with JS Date, stricter than java.time) can read it. A value
// that already carries a zone (…Z or …±hh:mm) is returned unchanged; null/blank → null; an
// unrecognized shape → null (the field just has no usable value — same R10 rationale as
// parseIsoUtcToEpochMs). This deliberately does NOT convert to epoch ms — that's the app's job.
fun ensureIsoUtc(value: String?): String? {
    val trimmed = value?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    if (trimmed.endsWith("Z") || Regex("""[+-]\d{2}:?\d{2}$""").containsMatchIn(trimmed)) return trimmed
    if (!ZONE_LESS_ISO.matches(trimmed)) return null
    val dotIndex = trimmed.indexOf('.')
    val base = if (dotIndex == -1) trimmed else trimmed.substring(0, dotIndex)
    val fraction = if (dotIndex == -1) "" else trimmed.substring(dotIndex + 1)
    val millis = fraction.take(3).padEnd(3, '0')
    return "$base.${millis}Z"
}
