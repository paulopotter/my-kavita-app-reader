# `:server` — API reference

Layer 2 generalizer module for content providers (Task 014's pattern). `Server` is the single
facade this module exposes — callers (Layer 3, `:app`'s bridge modules) only ever talk to
`Server`, never to a concrete plugin (`KavitaServerPlugin`) or the raw Kavita client directly.

This document exists to answer, per method: **exact signature, what it returns (with a real
example value), and every condition under which it throws** — so a caller building on top (e.g.
`:content-digest`, Task 018+) doesn't have to re-read `Server.kt`/`ServerBridgeModule.kt` end to
end every time.

## Conventions that apply to every method in this document

- **Every operation throws on failure, never returns a `Result`.** Callers wanting a typed
  success/failure split (e.g. `PageDigest.Success`/`Failure`) must `runCatching` themselves —
  `:server` never does this for them.
- **No caching beyond `ServerPlugin.DEFAULT_READ_PROTECTION_WINDOW_MS`** (a 3-second single-flight
  memoization inside `KavitaServerPlugin`, not a real cache — see the Kavita-specific notes
  further down). Every content call hits the network unless noted otherwise.
- **`credentialsJson` is sensitive** (the raw API key/credential values a user entered). It
  appears in `ServerGroupInfo`/`NewServerGroup`. Never forward it as-is into a contract a UI layer
  or log might read.
- Every method below that's marked `suspend` acquires `activeMutex` internally at some point in
  its call chain (directly, or via `resolvePlugin`/`getActiveContent`) — a group switch
  (`setActiveGroup`/`reauthenticateActiveGroup`) can never interleave mid-call with a content call
  or with `group(id).getActive()`.

---

## Data types

### Returned by read operations

```kotlin
data class ProviderInfo(
    val id: String,           // e.g. "kavita" — stable technical id, used as the key into providerId elsewhere
    val displayName: String,  // e.g. "Kavita" — user/log-facing name
    val version: String,      // e.g. "1.0.0" — this Kotlin adapter's own version, not the remote server's
)

data class ServerGroupInfo(
    val id: String,
    val name: String,             // user-chosen label, e.g. "Minha Kavita"
    val providerId: String,       // matches a ProviderInfo.id, e.g. "kavita"
    val credentialsJson: String,  // ⚠️ RAW SECRET — e.g. {"apiKey":"abc123..."} — never forward unfiltered
    val healthCheckPath: String,  // e.g. "/api/health" — path appended to a candidate URL to test it's alive
)

data class ServerUrlInfo(
    val id: String,
    val groupId: String,
    val url: String,       // e.g. "http://192.168.1.5:5000" — no secrets, safe to expose as-is
    val timeoutMs: Int,    // e.g. 5000
    val priority: Int,     // lower = tried first, e.g. 1
)

// ServerGroupInfo + ServerUrlInfo, flattened side by side — deliberately excludes
// credentialsJson (secret) AND healthCheckPath (pure config-time infra detail). The "which
// server answered this, safe to expose" shape — see Server.getActiveInfo() below.
data class ServerActiveInfo(
    val groupId: String,
    val groupName: String,
    val providerId: String,
    val urlId: String,
    val url: String,
    val timeoutMs: Int,
    val priority: Int,
)

// The envelope every READ content method (serials.list, serial().get, chapters.list,
// chapter().get, chapter().getProgress, page().getDimensions, page().getUrl) returns — see the
// "Every READ content method returns ServerResponse<T>" section below for the full rationale.
data class ServerResponse<T>(
    val data: T,
    val serverInfo: ServerActiveInfo,
    val resolvedAtEpochMs: Long,
)
```

### Passed to write operations

```kotlin
data class NewServerGroup(
    val name: String,
    val providerId: String,
    val credentialsJson: String,   // validated against the provider's own CredentialField.validate at Server.groups.add() time
    val healthCheckPath: String,
)

data class NewServerUrl(
    val url: String,
    val timeoutMs: Int,     // must be > 0
    val priority: Int,      // must be >= 0
)
```

### Content DTOs (provider-agnostic — see `ServerPlugin.kt`)

```kotlin
data class PluginSerial(
    val id: String,
    val name: String,
    val pagesRead: Int,
    val totalPages: Int,
    val lastUpdatedUtc: String?,
    val summary: String?,
    val genres: List<String>,
    val tags: List<String>,
)

data class PluginChapter(
    val id: String,
    val title: String,
    val number: String?,       // Kavita's raw chapter number string — may be non-numeric ("Special")
    val pageCount: Int,
    val pagesRead: Int,
    val isSpecial: Boolean,
    val decimalNumber: Double,   // Kavita's real SortOrder — authoritative numeric ordering value
    val specialLabel: String?,   // Kavita's real Range — populated when it diverges from decimalNumber
    val createdUtc: String?,
    val lastReadingProgressUtc: String?,   // Kavita's real ChapterDto.lastReadingProgressUtc — source for a resumePoint's recordedAtEpochMs
    val fileFormat: String?,     // free-form text as far as :server is concerned — Kavita's own MangaFormat→text table lives only in KavitaServerPlugin
)

data class PluginProgress(
    val pageIndex: Int,        // 0-indexed
    val updatedAtUtc: String?,
)

data class PluginPageDimension(
    val width: Int,     // non-nullable — the Kavita adapter throws instead of returning a partial/null value if the server has no dimension for this page
    val height: Int,
)

enum class ImageOrientation { PORTRAIT, LANDSCAPE }

// The one place aspectRatio/orientation/hasFetchedDimensions get computed for any image this
// module resolves — every caller (Page's url+dimensions, a cover's url) builds its own
// ImageDescriptor through buildImageDescriptor() below instead of re-deriving the same formula.
// Already carries server/resolvedAtEpochMs (same idiom PageDigest.Success already used before
// this module existed) — a READ method returning this is NOT also wrapped in ServerResponse<T>
// (would duplicate serverInfo/resolvedAtEpochMs for no reason); see serial().getCoverImage()/
// chapter().getCoverImage() below, which return ImageDescriptor directly.
data class ImageDescriptor(
    val url: String,
    val hasFetchedDimensions: Boolean,
    val width: Int?,
    val height: Int?,
    val aspectRatio: Double?,      // width/height — landscape when >1, portrait when <1, null when exactly 1 (perfect square) or dimensions unknown
    val orientation: ImageOrientation?,
    val resolvedAtEpochMs: Long,
    val server: ServerActiveInfo,
    val cache: Nothing?,           // always null — no Cache module exists yet (Task 015's guideline, same as PageDigest)
)

// Pure — no network, no knowledge of who's calling or how many requests it took to gather
// url/width/height. server/resolvedAtEpochMs/cache are passed in because each caller decides
// those differently (e.g. a caller doing R11's "last successful call wins" logic across several
// calls is the caller's own job, not this function's).
fun buildImageDescriptor(
    url: String,
    width: Int?,
    height: Int?,
    resolvedAtEpochMs: Long,
    server: ServerActiveInfo,
    cache: Nothing? = null,
): ImageDescriptor
```

### Exceptions

- **`ServerException`** (this module's own) — thrown by `Server`/`GroupHandle` methods
  themselves, for validation failures and "not found" cases (see each method below for exact
  messages/conditions).
- **`KavitaServerPluginException`** (adapter-specific) — thrown from inside a content call when
  the Kavita adapter itself fails in a way that isn't a network error (e.g. "no dimension for
  this page index"). A different provider's own exception type would surface the same way for its
  own adapter — `Server` never wraps or reinterprets these.
- **`IOException`** (raw, from `java.io`) — a genuine network failure (connection refused,
  timeout, DNS). Content calls retry once automatically on this specific exception type (see
  `withUrlRetry` below) — a second `IOException` in a row propagates uncaught.

---

## `Server.providers` — static catalog, no network, no exceptions

```kotlin
fun list(): List<ProviderInfo>
```
**Example:**
```kotlin
server.providers.list()
// listOf(ProviderInfo(id = "kavita", displayName = "Kavita", version = "1.0.0"))
```

## `Server.groups` — CRUD for registered server groups (one group = one provider account, e.g. one Kavita login)

```kotlin
suspend fun list(): List<ServerGroupInfo>
suspend fun get(groupId: String): ServerGroupInfo?
suspend fun add(group: NewServerGroup): ServerGroupInfo
suspend fun update(groupId: String, name: String? = null, credentialsJson: String? = null, healthCheckPath: String? = null): ServerGroupInfo
suspend fun remove(groupId: String)
```

### `list()`
No exceptions. Empty list if no group is registered yet.
```kotlin
server.groups.list()
// listOf(ServerGroupInfo(id="g1", name="Minha Kavita", providerId="kavita", credentialsJson="{\"apiKey\":\"abc123\"}", healthCheckPath="/api/health"))
```

### `get(groupId)`
No exceptions — `null` instead, if `groupId` isn't registered.
```kotlin
server.groups.get("g1")
// ServerGroupInfo(id="g1", name="Minha Kavita", providerId="kavita", credentialsJson="{\"apiKey\":\"abc123\"}", healthCheckPath="/api/health")

server.groups.get("does-not-exist")
// null
```

### `add(group)`
**Throws `ServerException`** if:
- `group.providerId` isn't a registered provider ("Unknown providerId: \$providerId").
- `group.name` or `group.healthCheckPath` is blank.
- `group.credentialsJson` isn't valid JSON, or fails any of the provider's own
  `CredentialField.validate` checks (e.g. Kavita's `apiKey` blank).
```kotlin
server.groups.add(NewServerGroup(
    name = "Minha Kavita",
    providerId = "kavita",
    credentialsJson = "{\"apiKey\":\"abc123\"}",
    healthCheckPath = "/api/health",
))
// ServerGroupInfo(id="<generated-uuid>", name="Minha Kavita", providerId="kavita", credentialsJson="{\"apiKey\":\"abc123\"}", healthCheckPath="/api/health")
```

### `update(groupId, name?, credentialsJson?, healthCheckPath?)`
`null` parameters mean "don't change this field" — passing nothing changes nothing but still
returns the current row. **Throws `ServerException`** if `groupId` doesn't exist, or if a
non-null `name`/`healthCheckPath` is blank, or a non-null `credentialsJson` fails validation
(same rules as `add`). **Side effect:** if `credentialsJson` actually changes, the group's cached
session (`sessionByGroupId`) is cleared — the next content call authenticates fresh instead of
reusing a session issued for the old credentials.
```kotlin
server.groups.update("g1", name = "Kavita (casa)")
// ServerGroupInfo(id="g1", name="Kavita (casa)", providerId="kavita", credentialsJson="{\"apiKey\":\"abc123\"}", healthCheckPath="/api/health")
```

### `remove(groupId)`
No exceptions, even if `groupId` doesn't exist (deletes are no-ops on a missing row). Also
deletes every `ServerUrlEntity` belonging to that group.
```kotlin
server.groups.remove("g1")   // Unit
```

## `Server.group(groupId)` — URL management + active-URL introspection for one group

```kotlin
suspend fun getUrls(): List<ServerUrlInfo>
suspend fun addUrl(url: NewServerUrl): ServerUrlInfo
suspend fun updateUrl(urlId: String, url: String? = null, timeoutMs: Int? = null, priority: Int? = null): ServerUrlInfo
suspend fun removeUrl(urlId: String)
suspend fun validateUrls(): ServerUrlInfo
suspend fun getActive(): ServerUrlInfo?
```

### `getUrls()`
No exceptions. Empty list if the group has no URLs configured.
```kotlin
server.group("g1").getUrls()
// listOf(
//   ServerUrlInfo(id="u1", groupId="g1", url="http://192.168.1.5:5000", timeoutMs=5000, priority=1),   // LAN, tried first
//   ServerUrlInfo(id="u2", groupId="g1", url="https://kavita.example.com", timeoutMs=8000, priority=2), // external fallback
// )
```

### `addUrl(url)`
**Throws `ServerException`** if: the group doesn't exist ("Server group not found: \$groupId"),
`url.url` is blank, `url.timeoutMs <= 0`, or `url.priority < 0`.
```kotlin
server.group("g1").addUrl(NewServerUrl(url = "http://192.168.1.5:5000", timeoutMs = 5000, priority = 1))
// ServerUrlInfo(id="<generated-uuid>", groupId="g1", url="http://192.168.1.5:5000", timeoutMs=5000, priority=1)
```

### `updateUrl(urlId, url?, timeoutMs?, priority?)`
**Throws `ServerException`** if `urlId` doesn't exist *for this group* ("Server url not found:
\$urlId in group \$groupId" — a urlId belonging to a *different* group also throws this), or if a
non-null `url`/`timeoutMs`/`priority` fails the same checks as `addUrl`.
```kotlin
server.group("g1").updateUrl("u1", priority = 0)
// ServerUrlInfo(id="u1", groupId="g1", url="http://192.168.1.5:5000", timeoutMs=5000, priority=0)
```

### `removeUrl(urlId)`
**Throws `ServerException`** if `urlId` doesn't exist for this group (same message as `updateUrl`).
```kotlin
server.group("g1").removeUrl("u1")   // Unit
```

### `validateUrls()`
Tests **every** configured URL for this group, right now, live — always ignores `UrlSelector`'s
15-minute cache (this is "test my server" behavior, not "trust what was last known"). Returns
whichever `ServerUrlInfo` actually answered its health check. **Throws `ServerException`** if the
group doesn't exist, has no URLs configured ("Server group has no URLs configured: \$groupId"),
or none of them answered ("Could not resolve a healthy URL for group \$groupId: ...").
```kotlin
server.group("g1").validateUrls()
// ServerUrlInfo(id="u1", groupId="g1", url="http://192.168.1.5:5000", timeoutMs=5000, priority=1)
```

### `getActive()`
No exceptions — `null` instead. Returns whichever `ServerUrlInfo` **actually won** the last time
this group's plugin was resolved **for any reason** — `setActiveGroup`/`reauthenticateActiveGroup`
authenticating, or a content call (`serial(id)...`/`chapter(id)...`/`page(idx)...`) — recorded
inside `resolvePlugin` every time it runs, including after a `withUrlRetry` re-selection. **Never
touches the network itself** and **never re-runs selection** — this is the core difference from
`validateUrls()`, which always re-checks live. `null` means "this group has never been resolved
at all in this process" — since `setActiveGroup` itself resolves it once to authenticate, `null`
in practice only happens before the group's very first `setActiveGroup` call.

The intent: let a caller see the URL actually used drift over time as the app runs — e.g. it
authenticated on the LAN URL when the app opened, but a later page request silently fell back to
a different URL after a network change, and the next request after that landed on a third one.
```kotlin
server.group("g1").getActive()
// null — "g1" has never been resolved at all yet

server.setActiveGroup("g1")   // resolves g1's plugin once, to authenticate — this already counts
server.group("g1").getActive()
// ServerUrlInfo(id="u1", groupId="g1", url="http://192.168.1.5:5000", timeoutMs=5000, priority=1)

server.serial("s1").chapter("c1").page(0).getUrl()   // resolves g1's plugin again — may land on a different url
server.group("g1").getActive()
// reflects whichever url THIS most recent resolution actually used, possibly different from before
```

## `Server.getActive()` — same as `group(id).getActive()`, for whichever group is currently active

```kotlin
suspend fun getActive(): ServerUrlInfo?
```
No exceptions — `null` instead. Reads `getActiveGroupId()` internally, so no `groupId` parameter
is needed. `null` only when no group is active at all — delegates to `group(id).getActive()` once
`activeGroupId` is known, so the same "reflects the last resolution, for any reason" semantics
apply (see above).
```kotlin
server.getActive()   // null — no group selected yet

server.setActiveGroup("g1")
server.getActive()   // ServerUrlInfo(id="u1", ...) — setActiveGroup's own resolution already counts

server.serial("s1").chapter("c1").page(0).getUrl()
server.getActive()   // reflects whichever url this most recent resolution actually used
```

## `Server.getActiveInfo()` — group + active URL, flattened, no secrets — the shape a Layer 3 contract wants

```kotlin
suspend fun getActiveInfo(): ServerActiveInfo?
```
Reads the already-assembled `ServerActiveInfo` that `resolvePlugin` recorded the last time the
active group was resolved, for any reason — never re-resolves or re-fetches anything itself.
`credentialsJson`/`healthCheckPath` were never part of `ServerActiveInfo` to begin with. `null`
under the same condition as `getActive()`: no group active at all, or one active but never
resolved yet in this process.
```kotlin
server.getActiveInfo()   // null — no group selected yet

server.setActiveGroup("g1")
server.getActiveInfo()
// ServerActiveInfo(groupId="g1", groupName="Minha Kavita", providerId="kavita",
//                   urlId="u1", url="http://192.168.1.5:5000", timeoutMs=5000, priority=1)
```

## Every READ content method returns `ServerResponse<T>` — except `getCoverImage()`

**Decision (Task 018 mini-iteration):** every content method that returns actual data — as
opposed to a write like `setRead`/`setProgress`, which stays `Unit` — is wrapped in
`ServerResponse<T>` (`data`, `serverInfo`, `resolvedAtEpochMs`). **One exception (Task 019):**
`serial(id).getCoverImage()`/`chapter(id).getCoverImage()` return `ImageDescriptor` directly, not
`ServerResponse<ImageDescriptor>` — `ImageDescriptor` already carries `server`/`resolvedAtEpochMs`
as its own fields (same idiom `PageDigest.Success` already used before this module existed), so
wrapping it again would duplicate that data for no reason. This replaced an earlier design
where a caller (e.g. `:content-digest`'s `PageDigest`) would call a content method and *then*
separately call `getActiveInfo()` to find out which server answered — that had a real race: by
the time the second call ran, a different group/URL resolution could already have happened.

**How it's built, so there's no race:** `resolvePlugin` already knows the exact `group`+`url` it
just resolved for *this specific call* — it assembles the `ServerActiveInfo` right there
(`buildActiveInfo`, a pure function, no extra fetch) and records it. `withUrlRetryEnveloped` (the
read-path counterpart to `withUrlRetry`) then reads that exact same record immediately after the
content call succeeds and wraps `data` with it — always the resolution that produced *this*
`data`, never a later or independent one.
```kotlin
server.serial("s1").chapter("c1").page(3).getDimensions()
// ServerResponse(
//   data = PluginPageDimension(width=1240, height=1754),
//   serverInfo = ServerActiveInfo(groupId="g1", groupName="Minha Kavita", providerId="kavita",
//                                  urlId="u1", url="http://192.168.1.5:5000", timeoutMs=5000, priority=1),
//   resolvedAtEpochMs = 1755878400000,
// )
```

## `Server.setActiveGroup` / `reauthenticateActiveGroup` / `getActiveGroupId`

```kotlin
suspend fun setActiveGroup(groupId: String)
suspend fun reauthenticateActiveGroup(groupId: String)
fun getActiveGroupId(): String?
```

### `setActiveGroup(groupId)`
Authenticates **only if no session is already cached** for this group (re-selecting an
already-active group, or one authenticated before, is then a no-network no-op besides setting the
pointer). **Throws** whatever `resolvePlugin` throws (`ServerException` — group not found, no
URLs configured, no healthy URL) or whatever the adapter's `authenticate()` throws on bad
credentials/network failure (e.g. `KavitaServerPluginException`, or a raw `IOException` — **not**
retried here, `withUrlRetry` only wraps content calls, not this method).
```kotlin
server.setActiveGroup("g1")   // Unit
```

### `reauthenticateActiveGroup(groupId)`
Same as `setActiveGroup`, but **always** forces a fresh `authenticate()` even if a session is
already cached — e.g. after the user changes credentials, or the server rejected the session
(401) and a fresh login is needed. Same throw conditions as `setActiveGroup`.

### `getActiveGroupId()`
Synchronous, no network, never throws.
```kotlin
server.getActiveGroupId()   // null — before any setActiveGroup call this process
server.setActiveGroup("g1")
server.getActiveGroupId()   // "g1"
```

## `Server.getActiveContent(...)` — advanced/internal; most callers don't need this directly

```kotlin
suspend fun getActiveContent(forceUrlReselect: Boolean = false, groupId: String? = null): ServerPlugin
```
Resolves the active group's healthy URL and builds a live `ServerPlugin` instance for it. Every
`serials`/`serial(id)`/etc. method below already calls this internally per-request via
`withUrlRetry` — direct use is only relevant for advanced cases (none exist in the codebase yet).
`forceUrlReselect`/`groupId` are only ever passed by `withUrlRetry` itself, after a network
failure. **Throws `ServerException`** ("No active server group set — call setActiveGroup(id)
first") if `groupId` is null and no group is active.

## `Server.serials` / `Server.serial(id)` — content tree

Every method below is wrapped in `withUrlRetry`: on `IOException` (connection refused, timeout,
DNS — **never** an HTTP status code, which surfaces as a normal return value from `RequestTool`,
not an exception), the active URL is force-reselected (ignoring the 15-min cache) and the call
retried exactly once against a freshly-built plugin. A second `IOException` in a row propagates
uncaught. **All also throw `ServerException`("No active server group set...")** if no group is
active yet.

```kotlin
suspend fun serials.list(): ServerResponse<List<PluginSerial>>

suspend fun serial(serialId: String).get(): ServerResponse<PluginSerial>
suspend fun serial(serialId: String).getCoverImage(): ImageDescriptor   // NOT ServerResponse<T> — ImageDescriptor already carries server/resolvedAtEpochMs itself, see above
suspend fun serial(serialId: String).chapters.list(): ServerResponse<List<PluginChapter>>
suspend fun serial(serialId: String).chapters.setRead(isRead: Boolean, chapterIds: List<String>)   // Unit — write, no envelope

suspend fun serial(serialId).chapter(chapterId: String).get(): ServerResponse<PluginChapter>
suspend fun serial(serialId).chapter(chapterId).getCoverImage(): ImageDescriptor   // same pattern as serial().getCoverImage()
suspend fun serial(serialId).chapter(chapterId).setRead(isRead: Boolean)   // Unit — write, no envelope
suspend fun serial(serialId).chapter(chapterId).getProgress(): ServerResponse<PluginProgress?>
suspend fun serial(serialId).chapter(chapterId).setProgress(pageIndex: Int)   // Unit — write, no envelope

suspend fun serial(serialId).chapter(chapterId).page(pageIndex: Int).getDimensions(): ServerResponse<PluginPageDimension>
suspend fun serial(serialId).chapter(chapterId).page(pageIndex).getUrl(): ServerResponse<String>   // NOT suspend in ServerPlugin.Page, but IS suspend on Server.Page (wrapped in withUrlRetry) — see Kavita note below
```
See "Every READ content method returns `ServerResponse<T>`" above for what `serverInfo`/
`resolvedAtEpochMs` mean and why. The examples below show the full envelope only once
(`getDimensions()`) — every other read method wraps the same way; only `data`'s shape differs.

### `serials.list()`
```kotlin
server.serials.list().data
// listOf(PluginSerial(id="s1", name="One Piece", pagesRead=340, totalPages=1200,
//                      lastUpdatedUtc="2026-08-20T10:00:00Z", summary=null, genres=[], tags=[]))
```

### `serial(serialId).get()`
**Throws** (Kavita adapter) if the series doesn't exist on the server — surfaces as whatever HTTP
error `RequestTool` raises for that provider's real API call.
```kotlin
server.serial("s1").get().data
// PluginSerial(id="s1", name="One Piece", pagesRead=340, totalPages=1200,
//              lastUpdatedUtc="2026-08-20T10:00:00Z", summary="A pirate crew...", genres=["Action"], tags=["Pirates"])
```

### `serial(serialId).getCoverImage()`
Pure string concatenation for the Kavita adapter (`buildSeriesCoverUrl`) — never throws on its
own (no network call). `width`/`height` are always `null`, `hasFetchedDimensions`/`aspectRatio`/
`orientation` follow from that (no dedicated dimensions endpoint exists for a series/chapter
cover). Returns `ImageDescriptor` directly, not wrapped in `ServerResponse<T>` — see above.
```kotlin
server.serial("s1").getCoverImage()
// ImageDescriptor(url="https://kavita.example.com/api/Image/series-cover?seriesId=s1&apiKey=abc123...",
//                  hasFetchedDimensions=false, width=null, height=null, aspectRatio=null, orientation=null,
//                  resolvedAtEpochMs=1755878400000,
//                  server=ServerActiveInfo(groupId="g1", groupName="Minha Kavita", providerId="kavita",
//                                           urlId="u1", url="http://192.168.1.5:5000", timeoutMs=5000, priority=1),
//                  cache=null)
```

### `serial(serialId).chapters.list()`
```kotlin
server.serial("s1").chapters.list().data
// listOf(
//   PluginChapter(id="c1", title="Romance Dawn", number="1", pageCount=54, pagesRead=54, isSpecial=false),
//   PluginChapter(id="c2", title="Buggy the Clown", number="2", pageCount=48, pagesRead=0, isSpecial=false),
// )
```

### `serial(serialId).chapters.setRead(isRead, chapterIds)`
```kotlin
server.serial("s1").chapters.setRead(isRead = true, chapterIds = listOf("c1", "c2"))   // Unit — write, no envelope
```

### `serial(serialId).chapter(chapterId).get()`
**Throws `KavitaServerPluginException`("Chapter \$chapterId not found in series \$seriesId")** if
the id isn't found in that series' chapter list (see Kavita-specific notes below — this is a
real, reachable path, not defensive).
```kotlin
server.serial("s1").chapter("c1").get().data
// PluginChapter(id="c1", title="Romance Dawn", number="1", pageCount=54, pagesRead=54, isSpecial=false)
```

### `serial(serialId).chapter(chapterId).getCoverImage()`
Same shape/rationale as `serial(serialId).getCoverImage()`, built via `buildChapterCoverUrl`.
```kotlin
server.serial("s1").chapter("c1").getCoverImage()
// ImageDescriptor(url="https://kavita.example.com/api/Image/chapter-cover?chapterId=c1&apiKey=abc123...",
//                  hasFetchedDimensions=false, width=null, height=null, aspectRatio=null, orientation=null,
//                  resolvedAtEpochMs=1755878400000, server=ServerActiveInfo(...), cache=null)
```

### `serial(serialId).chapter(chapterId).setRead(isRead)`
```kotlin
server.serial("s1").chapter("c1").setRead(true)   // Unit — write, no envelope
```

### `serial(serialId).chapter(chapterId).getProgress()`
No exceptions beyond the general ones — `data` is `null` instead, if the server has no progress
recorded for this chapter yet (not an error state; `serverInfo` is still present even when `data`
is null, since the call itself still succeeded).
```kotlin
server.serial("s1").chapter("c1").getProgress().data
// PluginProgress(pageIndex=27, updatedAtUtc="2026-08-21T18:30:00Z")
// or null
```

### `serial(serialId).chapter(chapterId).setProgress(pageIndex)`
```kotlin
server.serial("s1").chapter("c1").setProgress(27)   // Unit — write, no envelope
```

### `serial(serialId).chapter(chapterId).page(pageIndex).getDimensions()`
**Throws `KavitaServerPluginException`("No dimension for page \$pageIndex")** if the index is out
of range for what the server returned — real, reachable failure path.
```kotlin
server.serial("s1").chapter("c1").page(3).getDimensions()
// ServerResponse(
//   data = PluginPageDimension(width=1240, height=1754),
//   serverInfo = ServerActiveInfo(groupId="g1", groupName="Minha Kavita", providerId="kavita",
//                                  urlId="u1", url="http://192.168.1.5:5000", timeoutMs=5000, priority=1),
//   resolvedAtEpochMs = 1755878400000,
// )
```

### `serial(serialId).chapter(chapterId).page(pageIndex).getUrl()`
Pure string concatenation for the Kavita adapter — see note below. `Server.Page.getUrl()` is
still declared `suspend` (and wrapped in `withUrlRetryEnveloped`) because a *different* future
provider's `getUrl()` might need the network; today's Kavita path never actually suspends on I/O.
```kotlin
server.serial("s1").chapter("c1").page(3).getUrl().data
// "https://kavita.example.com/api/reader/image?chapterId=c1&page=3&apiKey=abc123..."
```

### Kavita adapter (`KavitaServerPlugin`) — real behavior notes, for context

- **Kavita has no per-chapter-by-id endpoint.** `chapter(id).get()` re-fetches/filters the whole
  series' volume list, memoized 3s within one `Serial` instance (`KavitaSerial.volumes()`) — so
  `chapters.list()` and `chapter(id).get()` on the *same* series, called close together, don't
  double the network cost. A *different* series still pays full price each time.
- **`chapters.setRead`/`chapter.setRead`/`chapter.setProgress` invalidate that series' memoized
  volume list** — the next `list()`/`get()` after a write is never stale.
- **`page(idx).getUrl()` never needs a valid session.** It only reads the already-known `apiKey`
  to build a URL string; the `jwt` parameter is never touched. It still requires an active group
  to resolve a base URL from, but will never itself trigger an authentication network call.

## `ServerBridgeModule` (`:app`) — what's exposed to RN today

One `@ReactMethod` per `Server` operation, 1:1 — translates thrown exceptions into
`Promise.reject(code, message)` and DTOs into `WritableMap`/`WritableArray`. No orchestration
logic lives here (see the file's own header comment) — nothing here does more than `Server`
itself already does. No RN consumer exists yet as of Task 017 (nothing calls
`frontend/src/shared/bridge/server.ts`).

**READ methods unwrap `.data` before crossing the bridge** — `serverInfo`/`resolvedAtEpochMs`
are not sent to RN today (nothing on that side consumes them yet); only the plain `data` value is
exposed, same shape as before `ServerResponse<T>` existed.

| `@ReactMethod` | Delegates to | Reject code on failure |
|---|---|---|
| `listProviders(promise)` | `server.providers.list()` | `LIST_PROVIDERS_ERROR` |
| `listGroups(promise)` | `server.groups.list()` | `LIST_GROUPS_ERROR` |
| `getGroup(groupId, promise)` | `server.groups.get(groupId)` | `GET_GROUP_ERROR` |
| `addGroup(name, providerId, credentialsJson, healthCheckPath, promise)` | `server.groups.add(...)` | `ADD_GROUP_ERROR` |
| `updateGroup(groupId, name?, credentialsJson?, healthCheckPath?, promise)` | `server.groups.update(...)` | `UPDATE_GROUP_ERROR` |
| `removeGroup(groupId, promise)` | `server.groups.remove(groupId)` | `REMOVE_GROUP_ERROR` |
| `getGroupUrls(groupId, promise)` | `server.group(groupId).getUrls()` | `GET_GROUP_URLS_ERROR` |
| `addGroupUrl(groupId, url, timeoutMs, priority, promise)` | `server.group(groupId).addUrl(...)` | `ADD_GROUP_URL_ERROR` |
| `updateGroupUrl(groupId, urlId, url?, timeoutMs?, priority?, promise)` | `server.group(groupId).updateUrl(...)` | `UPDATE_GROUP_URL_ERROR` |
| `removeGroupUrl(groupId, urlId, promise)` | `server.group(groupId).removeUrl(urlId)` | `REMOVE_GROUP_URL_ERROR` |
| `validateGroupUrls(groupId, promise)` | `server.group(groupId).validateUrls()` | `VALIDATE_GROUP_URLS_ERROR` |
| `setActiveGroup(groupId, promise)` | `server.setActiveGroup(groupId)` | `SET_ACTIVE_GROUP_ERROR` |
| `reauthenticateActiveGroup(groupId, promise)` | `server.reauthenticateActiveGroup(groupId)` | `REAUTHENTICATE_ERROR` |
| `getActiveGroupId(promise)` | `server.getActiveGroupId()` | `GET_ACTIVE_GROUP_ID_ERROR` |
| `listSerials(promise)` | `server.serials.list()` | `LIST_SERIALS_ERROR` |
| `getSerial(serialId, promise)` | `server.serial(serialId).get()` | `GET_SERIAL_ERROR` |
| `listChapters(serialId, promise)` | `server.serial(serialId).chapters.list()` | `LIST_CHAPTERS_ERROR` |
| `setChaptersRead(serialId, isRead, chapterIds, promise)` | `server.serial(serialId).chapters.setRead(...)` | `SET_CHAPTERS_READ_ERROR` |
| `getChapter(serialId, chapterId, promise)` | `server.serial(serialId).chapter(chapterId).get()` | `GET_CHAPTER_ERROR` |
| `setChapterRead(serialId, chapterId, isRead, promise)` | `.setRead(isRead)` | `SET_CHAPTER_READ_ERROR` |
| `getChapterProgress(serialId, chapterId, promise)` | `.getProgress()` | `GET_CHAPTER_PROGRESS_ERROR` |
| `setChapterProgress(serialId, chapterId, pageIndex, promise)` | `.setProgress(pageIndex)` | `SET_CHAPTER_PROGRESS_ERROR` |
| `getPageDimensions(serialId, chapterId, pageIndex, promise)` | `.page(pageIndex).getDimensions()` | `GET_PAGE_DIMENSIONS_ERROR` |
| `getPageUrl(serialId, chapterId, pageIndex, promise)` | `.page(pageIndex).getUrl()` | `GET_PAGE_URL_ERROR` |

**Not yet wired: `group(id).getActive()` / `server.getActive()`** — added in the Task 018
mini-iteration, after `ServerBridgeModule` was written. No `@ReactMethod` exposes them yet.
Whoever wires up `:content-digest` (Task 018+) calls `Server` directly, in-process (same
`:app`/Kotlin side) — no bridge crossing needed for that.
