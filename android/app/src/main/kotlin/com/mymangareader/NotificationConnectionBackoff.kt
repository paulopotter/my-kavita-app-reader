package com.mymangareader

import kotlin.math.pow

// How long to wait before the Nth retry (0-indexed) of resolving a healthy notification URL —
// NotificationConnectionService's own retry loop, for the step BEFORE a WebSocket ever opens
// (no candidate URL passed its health check yet). Deliberately separate from NtfyPlugin's own
// reconnect backoff (capped at 30s) — that one recovers a socket that already connected once and
// just dropped (a brief network blip), so a short cap makes sense there; this one is for "nothing
// is healthy right now at all", which can legitimately last a long time (server down for
// maintenance, no network), so it climbs much higher before capping — an hour, so the app doesn't
// hammer a URL that's known to be unreachable but still eventually notices it come back.
private const val RESOLVE_RETRY_INITIAL_MS = 5_000L
private const val RESOLVE_RETRY_MAX_MS = 60 * 60 * 1_000L

// Multiplying two already-converted Longs here would overflow well before the cap even matters
// (5_000L * 2^attempt as a Long wraps around to something negative for a large enough attempt,
// e.g. attempt=100 — verified the hard way) — so the whole exponential term stays a Double until
// AFTER it's compared against the cap, only converting to Long on the value that actually wins.
fun notificationResolveRetryDelayMs(attempt: Int): Long {
    val exponentialMs = RESOLVE_RETRY_INITIAL_MS * 2.0.pow(attempt)
    return if (exponentialMs >= RESOLVE_RETRY_MAX_MS) RESOLVE_RETRY_MAX_MS else exponentialMs.toLong()
}
