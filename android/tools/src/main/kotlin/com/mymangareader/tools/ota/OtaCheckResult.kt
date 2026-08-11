package com.mymangareader.tools.ota

sealed interface OtaCheckResult {
    // policy != null means a non-blocking advisory should be shown alongside
    data class UpToDate(val policy: PolicyMatch? = null) : OtaCheckResult
    data class Updated(val prevVersion: String, val newVersion: String, val policy: PolicyMatch? = null) : OtaCheckResult
    data class PolicyMatch(val mode: String, val releaseNotesUrl: String) : OtaCheckResult
    data class Error(val cause: Throwable) : OtaCheckResult
}
