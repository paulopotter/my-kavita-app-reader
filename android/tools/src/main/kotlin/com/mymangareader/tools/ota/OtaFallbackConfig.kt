package com.mymangareader.tools.ota

// When the configured OTA manifest (OTA_MANIFEST_URL — typically a local dev server, reachable
// only while scripts/ota-serve.sh runs) doesn't deliver an update, whether to ask the project's
// own published releases instead. Without this, a device left on a dev build never sees a real
// release: the dev server is down almost all the time, the check fails, and nothing happens.
//
// The two cases are deliberately separate because they mean different things:
//
//   onError      — the configured manifest couldn't be reached or parsed at all. We don't KNOW
//                  whether an update exists, so asking the official one costs nothing.
//   onNoUpdate   — it answered, and said there's nothing new. Here the dev server DID have an
//                  opinion, so consulting production second-guesses it; guarded by the version
//                  comparison below, it can still only ever move forward.
//
// Whatever the flags say, the fallback never regresses what's installed: a manifest is only
// accepted when it's genuinely newer (see OtaManager.isNewerThanInstalled), and a failure at any
// point leaves the working bundle exactly as it was.
data class OtaFallbackConfig(
    val officialManifestUrl: String,
    val onError: Boolean,
    val onNoUpdate: Boolean,
)
