package com.mymangareader.tools.ota

// Outcome of OtaManager.check() — the manifest fetch + policy + version evaluation, WITHOUT the
// bundle download. Split out from checkAndDownload() so the boot gate (MainActivity, holding the
// system splash via core-splashscreen) can act on the decision and let the actual download run in
// the background afterwards.
sealed interface OtaDecision {
    // required policy, or the running Kotlin build is below the manifest's minKotlinVersion.
    // The app must not proceed — MainActivity shows a blocking dialog and never reveals the RN UI.
    data class Blocked(
        val releaseNotesUrl: String,
    ) : OtaDecision

    // A newer bundle exists and may be downloaded. `advisory` is a non-blocking
    // highly_recommended / recommended policy to surface alongside (mode + releaseNotesUrl),
    // or null. Caller fires OtaManager.download(manifest) on a background scope.
    data class DownloadPending(
        val manifest: OtaManifest,
        val advisory: PolicyAdvisory?,
    ) : OtaDecision

    // Bundle already current. `advisory` same meaning as above.
    data class NothingToDo(
        val advisory: PolicyAdvisory?,
    ) : OtaDecision

    // Manifest fetch / parse failed. A failure here never blocks the boot.
    data class Failed(
        val cause: Throwable,
    ) : OtaDecision
}

// A non-blocking advisory policy (highly_recommended / recommended). Mirrors
// OtaCheckResult.PolicyMatch but names the non-blocking intent; `mode` is
// "highly_recommended" | "recommended".
data class PolicyAdvisory(
    val mode: String,
    val releaseNotesUrl: String,
)
