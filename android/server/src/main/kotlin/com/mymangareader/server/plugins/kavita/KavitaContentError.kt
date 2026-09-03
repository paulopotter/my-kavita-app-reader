package com.mymangareader.server.plugins.kavita

import com.mymangareader.server.plugins.ServerAuthException

/**
 * Every authenticated Kavita *content* call (series/chapter/reader — never the auth endpoints
 * themselves) passes its HTTP status here first. A 401 means the JWT this instance was built with
 * is no longer accepted: raise [ServerAuthException] so `Server` renews the session and replays
 * the call once. Any other status is left entirely to the caller's own existing check (a plain
 * provider failure with its own worded message) — this helper only carves out the 401.
 *
 * Auth endpoints (KavitaAuth) deliberately do NOT call this — there a 401 is the terminal
 * "wrong apiKey / dead refresh token" answer, and turning it into a ServerAuthException would
 * make Server's renew-and-retry cascade loop back into the call that just failed.
 */
internal fun kavitaRaiseIfSessionRejected(status: Int, context: String) {
    if (status == 401) throw ServerAuthException("$context: session rejected (HTTP 401)")
}
