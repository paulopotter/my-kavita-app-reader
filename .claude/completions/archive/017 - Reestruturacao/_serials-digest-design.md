# Design notes — `buildSerialsDigest` + `SerialsService.get` + Library freshness banner

> **STATUS (rc59, 2026-09-02): IMPLEMENTED.** All three parts below shipped:
> - Kotlin `SerialsDigest` + `buildSerialsDigest` in `:content-digest`
>   (`serial/SerialsDigest.kt`), cache-first via a merge into each series' own per-series cache
>   (domain `serial`, key `<id>:false:false`, variant `full:external` — the exact entry
>   `buildSerialDigest(id)` reads), `lastUpdatedEpochMs` derived from the newest touched
>   `cachedAtEpochMs`, background `force=true` refresh when stale (TTL constant shared with
>   `buildSerialDigest` via `SERIAL_CACHE_TTL_MS` / `isSerialCacheStale`).
> - `SerialFields.Pages` (`read`/`total`) added to `SerialDigest` so a list-row digest still
>   carries Kavita's series-level page progress (populated in both `fetchSerialDigest` and
>   `serialDigestFromListData`). RN `SerialPages` + `SerialDigestSuccess.pages`, threaded through
>   `SerieTool.normalize` → `Serie.pages`.
> - `DigestBridge.getSerialsDigest` + `SerialsDigest.toWritableMap()` mapper.
> - RN `SerialsService.get({ force })` → `SerialsDigest`; `SerialsService.raw.list()` kept for
>   the smoke test. `SeriesTool.normalize({ serials: SerialDigest[] })` now just filters
>   Failures + delegates to `SerieTool.normalize` per item.
> - `library.hooks.ts`: dropped the RN `Store` snapshot entirely (Kotlin per-series cache is the
>   warm-start source). Added `bannerState` (`none` / `confirmed` / `stale` / `offline`) +
>   `DateTool.format.to.time`. New `<FreshnessBanner>` dumb component. i18n reworked:
>   `dateMinutesAgo/HoursAgo/DaysAgo` → "minuto(s)"/"hora(s)"/"dia(s)"; `libraryUpdatedAt`
>   (absolute), `libraryOfflineStale` / `libraryOfflineNoDate`.
>
> Verified: `compileDebugKotlin` + `:content-digest`/`:app` unit tests + `koverVerify` (floor 81),
> `tsc`, `jest` (743 tests, 54 suites), JS coverage floors bumped 66→67 / 75→76.
>
> Original notes below (captured mid-implementation), kept for the rationale.

---

> Captured mid-implementation (2026-09-02). Feeds Tasks 028 / 036. The Kotlin `:server`
> `SerialData`/`SerialListData` normalization and the RN `SeriesTool` / `LibraryTool` split are
> already done (rc52). The date-format fix (`DateTool` + Kotlin `ensureIsoUtc`) is done and
> verified. What remains below is the `buildSerialsDigest` layer + the banner.

## Why

`serials.list()` was the only content path with **no cache** — `:server` is passthrough, and
`:content-digest` had `buildSeriesDigest` (one series) but no list equivalent. So the Library
always hit the network on every mount and had no `isExpired` / `cachedAtEpochMs` to tell the user
how fresh the data is. This closes that asymmetry.

## Rename (do first — pure mechanical, touches ~15 Kotlin files + tests + RN bridge)

`Series* → Serial*` throughout the digest layer, to match the RN side which already uses
`SerialService` / `SerialsService`:

| From | To |
|---|---|
| `buildSeriesDigest` | `buildSerialDigest` |
| `SeriesDigest` / `.Success` / `.Failure` | `SerialDigest` |
| `SeriesFields` | `SerialFields` |
| `SeriesDigestOptions` | `SerialDigestOptions` |
| `SERIES_CACHE_DOMAIN = "series"` | `SERIAL_CACHE_DOMAIN = "serial"` |
| `seriesDigestCacheKey` / `toSeriesCacheDescriptor` | `serialDigestCacheKey` / `toSerialCacheDescriptor` |
| `android/content-digest/.../series/SeriesDigest.kt` | `.../serial/SerialDigest.kt` |
| `DigestBridgeModule.getSeriesDigest` | `getSerialDigest` (+ new `getSerialsDigest`) |
| `DigestBridgeMappers`: `SeriesDigest.toWritableMap`, `putSeriesFields`, … | `SerialDigest.*` |
| RN `bridge/digest.ts`: `SeriesDigest*`, `SeriesDigestOptions`, `getSeriesDigest` | `SerialDigest*`, `getSerialDigest` (+ `getSerialsDigest`) |
| RN `SerialService.get` → `DigestBridge.getSeriesDigest` | `.getSerialDigest` |
| RN `SerieTool.normalize({ digest })` param type `SeriesDigestSuccess` | `SerialDigestSuccess` |

**Keep** the RN `SeriesDigestIndex` (`shared/tools/series/series-digest.index.ts`) name — it's a
UI-side index keyed by seriesId, not the Kotlin digest. Only the Kotlin digest + bridge rename.

**External metadata**: `SeriesDigest.metadata.external` (ExternalMetadataDigest) rides along —
rename its container refs too but the ExternalMetadata* types themselves are their own module,
untouched.

## `buildSerialsDigest` (`:content-digest`, new)

**Not a loop of network requests.** One `server.serials.list()` call already returns everything
the list needs (id/name/cover/pages/dates per series). For each item, assemble a `SerialDigest`
**directly from that list data** — same shape `buildSerialDigest` produces, with the fields the
list can't give (`chapters`, `metadata`, `resumePoint`) **absent** (null). No extra request.

```kotlin
suspend fun buildSerialsDigest(server: Server, cache: Cache, force: Boolean = false): SerialsDigest {
    val response = server.serials.list()                 // 1 request (cru), .data.serials
    val entries = response.data.serials.map { serial ->
        // Assemble a minimal SerialDigest.Success from `serial` (SerialData). chapters=null,
        // metadata=null, resumePoint absent. coverImage already an ImageDescriptor (Server built it).
        val minimal = serialDigestFromListData(serial, response.serverInfo, response.resolvedAtEpochMs)

        // MERGE into the per-series cache (domain "serial", key=id) — do NOT clobber a fuller
        // entry a prior buildSerialDigest(get) wrote. If the cached entry already has chapters,
        // keep them; only refresh the fields the list carries (name/cover/pages/dates).
        mergeSerialCache(cache, serial.id, minimal)      // returns the resulting CacheDescriptor
    }

    // `lastUpdated` is DERIVED, not stored: scan the per-series CacheDescriptors, take the newest.
    val lastUpdatedEpochMs = entries.mapNotNull { it.cache?.cachedAtEpochMs }.maxOrNull()

    // If the newest is older than the SERIAL domain's default TTL → kick a bg refresh
    // (re-run buildSerialsDigest force=true). Reuse the TTL constant from buildSerialDigest —
    // import it, do NOT duplicate the number.
    if (isStale(lastUpdatedEpochMs)) { bgScope.launch { buildSerialsDigest(server, cache, force = true) } }

    return SerialsDigest.Success(serials = entries.map { it.digest }, lastUpdatedEpochMs = lastUpdatedEpochMs)
}
```

Contract:
```kotlin
sealed interface SerialsDigest {
    data class Success(
        val serials: List<SerialDigest>,   // each is SerialDigest.Success (minimal) or .Failure
        val lastUpdatedEpochMs: Long?,     // newest cachedAtEpochMs across the per-series caches
    ) : SerialsDigest
    data class Failure(val error: ErrorDigest) : SerialsDigest   // only if serials.list() itself failed
}
```

- **No cache of its own.** `serials` reads the per-series caches (`buildSerialDigest`'s domain)
  and populates them. `lastUpdatedEpochMs` is derived each call.
- **`force=true`**: re-fetch `serials.list()`, re-merge every per-series cache.
- The minimal→cache merge must preserve a richer existing entry (chapters/metadata from a prior
  `get`). Simplest: read the existing cached `SerialDigest.Success`, `copy()` over just the
  list-sourced fields, write back.

## `DigestBridge.getSerialsDigest` + mapper

- `DigestBridgeModule.getSerialsDigest(options: ReadableMap, promise)` — `options` carries
  `force`. Calls `buildSerialsDigest(server, cache, force)`.
- `DigestBridgeMappers`: `SerialsDigest.toWritableMap()` → `{ isSuccess, serials: [SerialDigest…],
  lastUpdatedEpochMs }` / `{ isSuccess:false, error }`.
- RN `bridge/digest.ts`: `SerialsDigest` type + `getSerialsDigest(options): Promise<SerialsDigest>`.

## RN — `SerialsService`

- `.list()` → **renamed `.get()`** → `DigestBridge.getSerialsDigest({ force })` → `SerialsDigest`.
- New `.raw.list()` → the old direct `ServerBridge.listSerials()` (SerialData[]), for the smoke
  test / debugging only.
- `SeriesTool.normalize({ serials })` now takes `SerialDigest[]` (already digest-shaped) and
  **reuses `SerieTool.normalize` per item** — the item IS a digest, so it's literally
  `serials.map(d => d.isSuccess ? SerieTool.normalize({ digest: d }) : …)`. No more hand-mapping
  `SerialData` fields.
- `library.hooks.ts`: drop the `Store` snapshot entirely. `assembleLibrary` calls
  `SerialsService.get({ force })`, gets `{ serials, lastUpdatedEpochMs }`, runs `SeriesTool` +
  `LibraryTool`. The `SerialDigest` cache-first behavior (Kotlin) is what makes the mount fast —
  no RN-side snapshot needed.

## Library freshness banner (RN)

Below the header. States, driven by `SerialsDigest.lastUpdatedEpochMs` + the load outcome:

| State | When | Text (pt-BR) |
|---|---|---|
| `offline` | `getSerialsDigest` rejected / `SerialsDigest.Failure`, but there's still cached data shown | `(Sem conexão) Atualizado há 5 minutos` — `DateTool.format.to.relative(lastUpdatedEpochMs)` |
| `stale` | load OK but `lastUpdatedEpochMs` older than the SERIAL TTL | `Atualizado há 1 hora` |
| `fresh` (confirmed) | right after a pull-to-refresh that hit the network | `Atualizado às 14:30:51` — **absolute time**, `DateTool.format.to.time(...)`, auto-hides after ~4s |
| (none) | load OK, data fresh, not just force-refreshed | no banner |

`DateTool.format.to` needs a `time(epochMs): string` → `"HH:MM:SS"` (local). Relative-time
strings should read `há {0} minuto(s)` / `hora(s)` / `dia(s)` — reconsider the current
`min`/`h`/`d` shorthand added for this (user asked for words).

New i18n already added: `dateJustNow/dateMinutesAgo/dateHoursAgo/dateDaysAgo`,
`libraryUpdatedAgo/libraryUpdatedJustNow/libraryOfflineStale` — revisit the wording per the
table above (relative uses "minutos"/"hora"; confirmed uses absolute time).

## Constants (project rule: no magic numbers, every number from a named const with a "why")

- SERIAL digest TTL: **import from `buildSerialDigest`'s existing constant**, don't add a new one.
- Banner "confirmed" auto-hide: `LIBRARY_BANNER_CONFIRMED_MS` (~4000) in the hook.
