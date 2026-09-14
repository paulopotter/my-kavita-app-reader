package com.mymangareader.tools.ota

fun meetsMinKotlinVersion(
    actual: String,
    minimum: String,
): Boolean = compareSemver(actual, minimum) >= 0

fun meetsMinRnVersion(
    actual: String,
    minimum: String,
): Boolean = compareSemver(actual, minimum) >= 0

fun meetsMinAppVersion(
    actual: String,
    minimum: String,
): Boolean =
    runCatching {
        parseDatetimeTag(actual) >= parseDatetimeTag(minimum)
    }.getOrDefault(false)

// Is `candidate` a strictly newer app datetime tag (YYYY.MM.DD.HHMM) than `installed`?
//
// This is what keeps a fallback from ever moving the app BACKWARDS: production may answer a
// request that a local dev manifest couldn't, but its bundle is only taken when it's actually
// newer than what's already running. Equal tags are not newer — a re-check of the same release
// must not re-download it.
//
// Returns false when either tag can't be parsed, which is the safe answer: an unreadable version
// is not evidence that anything is newer, so nothing gets replaced.
fun isNewerAppVersion(
    candidate: String,
    installed: String,
): Boolean =
    runCatching {
        parseDatetimeTag(candidate) > parseDatetimeTag(installed)
    }.getOrDefault(false)

private fun compareSemver(
    actual: String,
    minimum: String,
): Int =
    runCatching {
        // Strip pre-release suffix (e.g. "0.2.0-rc9" → "0.2.0")
        val a = actual.substringBefore("-").split(".").map { it.toInt() }
        val b = minimum.substringBefore("-").split(".").map { it.toInt() }
        compareValuesBy(a, b, { it.getOrElse(0) { 0 } }, { it.getOrElse(1) { 0 } }, { it.getOrElse(2) { 0 } })
    }.getOrDefault(-1)

private fun parseDatetimeTag(tag: String): Long {
    // Format: YYYY.MM.DD.HHMM → Long for direct comparison
    val parts = tag.split(".")
    require(parts.size == 4) { "Expected YYYY.MM.DD.HHMM, got $tag" }
    return parts.joinToString("").toLong()
}
