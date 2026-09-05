package com.mymangareader

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
