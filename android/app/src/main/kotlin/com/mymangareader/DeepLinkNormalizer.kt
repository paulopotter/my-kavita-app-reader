package com.mymangareader

import java.util.UUID

// One unique id per notification tap — distinct from NotificationDisplay's notificationId(seriesId)
// (which stays the same across a series' notifications so a new batch replaces rather than stacks).
// MainActivity carries this in the Intent's extras and consumes it exactly once (see its own
// getIntent() doc) so re-opening the app later — from the launcher icon, or the recents list, both
// of which can hand back the very same Intent that originally launched the Activity — never
// re-triggers the same deep link a second time.
object DeepLinkTapId {
    fun next(): String = UUID.randomUUID().toString()
}

// The result of trying to consume a notification tap id exactly once (see MainActivity.getIntent()'s
// own doc) — pure set arithmetic, no SharedPreferences here, so it's testable on its own.
// [consumed] is what MainActivity should persist back, regardless of [wasFirstSeen]: even a repeat
// id updates the cap window the same way a fresh one would.
data class DeepLinkTapConsumption(
    val wasFirstSeen: Boolean,
    val consumed: Set<String>,
)

// A tap id is only ever needed once — reject a repeat, and cap how many are remembered so the
// persisted set never grows unbounded across a long-lived install.
fun consumeDeepLinkTapId(
    tapId: String,
    alreadyConsumed: Set<String>,
    maxRemembered: Int,
): DeepLinkTapConsumption {
    if (tapId in alreadyConsumed) return DeepLinkTapConsumption(wasFirstSeen = false, consumed = alreadyConsumed)
    val updated = alreadyConsumed + tapId
    val capped = if (updated.size > maxRemembered) updated.toList().takeLast(maxRemembered).toSet() else updated
    return DeepLinkTapConsumption(wasFirstSeen = true, consumed = capped)
}

// Every real entry point (the static mymangareader:// scheme, and any configured http(s) App
// Link host — see generateDeepLinkHosts in build.gradle.kts) already got validated by Android
// itself before this ever runs: the OS only hands MainActivity an Intent whose URI matched one
// of the registered intent-filters. So this function never re-validates a host — it only ever
// needs the URI's PATH, which is identical in shape regardless of which scheme/host it arrived
// through (/series/{id} or /reader/{seriesId}/{chapterId}).
//
// RN's `linking.config.ts` never sees mymangareader:// nor any configured host — every real URI
// is normalized to this one internal scheme before it ever reaches React Navigation, so adding a
// future entry point (another host, another custom scheme) never touches the RN side at all.
private const val DEEPLINK_SCHEME = "deeplink://"

// Returns null when the incoming URI carries no meaningful path at all (e.g. a bare
// `mymangareader://` with nothing after it, or something unexpected reaching this code) — the
// caller (MainActivity) leaves the Intent's data untouched in that case rather than force a
// broken deeplink:// URI onto RN.
//
// A custom-scheme URI (`mymangareader://series/123`) has its path right after "://" — the part
// after "://" IS "series/123", no host segment to strip (a custom scheme has no authority). A
// http(s) URI (`https://myhost.example/series/123`) has host + path there instead, so the host
// itself must be stripped first (Android already validated it against a configured
// deeplink.hostN — this function only needs whatever comes after it).
fun normalizeDeepLinkUri(rawUri: String): String? {
    val afterScheme = rawUri.substringAfter("://", missingDelimiterValue = "")
    if (afterScheme.isBlank()) return null

    val isHttp = rawUri.startsWith("http://") || rawUri.startsWith("https://")
    val path = if (isHttp) afterScheme.substringAfter('/', missingDelimiterValue = "") else afterScheme

    if (path.isBlank()) return null
    return "$DEEPLINK_SCHEME$path"
}

// The workaround for a deep link host we don't control (the Kavita server's own domain — see
// AndroidManifest.xml's ACTION_SEND intent-filter's own doc): the share sheet hands MainActivity
// free-form EXTRA_TEXT, e.g. "Check this series: https://host/series/123" or just the bare URL —
// never a URI already in Intent.data the way a tapped link is. Pulls the first http(s) URL out of
// that text so it can go through the exact same normalizeDeepLinkUri() path a real ACTION_VIEW
// link would. Returns null when the shared text carries no http(s) URL at all (sharing a photo
// caption, plain text with no link, etc.) — MainActivity leaves a SEND Intent with no URL alone.
private val HTTP_URL_REGEX = Regex("""https?://\S+""")

fun extractSharedUrl(sharedText: String?): String? = sharedText?.let { HTTP_URL_REGEX.find(it)?.value }
