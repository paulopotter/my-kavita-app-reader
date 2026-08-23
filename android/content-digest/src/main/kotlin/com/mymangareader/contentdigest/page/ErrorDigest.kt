package com.mymangareader.contentdigest.page

// Minimal shape — the design notes flag ErrorDigest's real taxonomy (distinguishing "resource
// genuinely doesn't exist" from "failed to reach it") as a real, not-yet-designed requirement.
// code = the throwing exception's own class name (e.g. "ServerException", "IOException") — good
// enough to log/branch on today, without inventing a code taxonomy this task doesn't need yet.
data class ErrorDigest(
    val code: String?,
    val message: String?,
)

internal fun Throwable.toErrorDigest() = ErrorDigest(code = this::class.simpleName, message = message)
