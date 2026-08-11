package com.mymangareader.tools.ota

fun meetsMinKotlinVersion(actual: String, minimum: String): Boolean =
    compareSemver(actual, minimum) >= 0

fun meetsMinRnVersion(actual: String, minimum: String): Boolean =
    compareSemver(actual, minimum) >= 0

fun meetsMinAppVersion(actual: String, minimum: String): Boolean = runCatching {
    parseDatetimeTag(actual) >= parseDatetimeTag(minimum)
}.getOrDefault(false)

private fun compareSemver(actual: String, minimum: String): Int = runCatching {
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
