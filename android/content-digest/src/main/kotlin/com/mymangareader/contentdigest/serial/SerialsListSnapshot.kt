package com.mymangareader.contentdigest.serial

import com.mymangareader.cache.Cache
import com.mymangareader.cache.CacheDescriptor
import com.mymangareader.cache.CacheMode
import kotlinx.serialization.Serializable

// The whole library list as ONE cache row, so a plain read of it (the Library and the Dashboard open
// it every time) costs a single query instead of a network round trip plus ~600 rewritten rows.
//
// It lives in its own domain on purpose: the per-series merge in buildSerialsDigest reads every row
// of the "serial" domain, and a row this size would be dragged into each of those reads.
//
// Freshness is judged by `syncedAtEpochMs` INSIDE the value, not by the row's own TTL: what the app
// learns locally (a chapter read, a series re-fetched after reading) is mirrored into the row without
// being a sync with the server, so it must not push the next real refresh further away.
internal const val SERIALS_SNAPSHOT_DOMAIN = "serials-list"
internal const val SERIALS_SNAPSHOT_VARIANT = "snapshot"
private const val SERIALS_SNAPSHOT_KEY = "all"

// How long the list is served without asking the server again. Short on purpose: a change made from
// another device shows up by the next open after this.
internal const val SERIALS_SNAPSHOT_TTL_MS = 5 * 60 * 1000L

// The row's own TTL is irrelevant (see above); it only has to outlive any realistic gap between uses.
private const val SERIALS_SNAPSHOT_ROW_TTL_MS = 30L * 24 * 60 * 60 * 1000

@Serializable
internal data class SerialsSnapshot(
    val syncedAtEpochMs: Long,
    // The server the list came from: a snapshot of another server (or of the same one at another
    // address, which the covers' URLs would still point to) is not served.
    val serverUrl: String,
    val serials: List<SerialDigest.Success>,
) {
    fun isStale(nowEpochMs: Long): Boolean = nowEpochMs - syncedAtEpochMs >= SERIALS_SNAPSHOT_TTL_MS

    // Each series carries the descriptor its per-series row would have, as a list built from the
    // network does (callers read `cache` for freshness).
    fun withDescriptors(): List<SerialDigest.Success> =
        serials.map {
            it.copy(
                cache =
                    CacheDescriptor(
                        key = serialsListCacheKey(it.id),
                        variant = SERIAL_CACHE_VARIANT,
                        domain = SERIAL_CACHE_DOMAIN,
                        mode = CacheMode.PERSISTENT,
                        cachedAtEpochMs = syncedAtEpochMs,
                        expiresAtEpochMs = syncedAtEpochMs + SERIALS_SNAPSHOT_TTL_MS,
                    ),
            )
        }
}

internal suspend fun writeSerialsSnapshot(
    cache: Cache,
    snapshot: SerialsSnapshot,
) {
    val encoded = serialDigestJson.encodeToString(SerialsSnapshot.serializer(), snapshot.copy(serials = snapshot.serials.map { it.copy(cache = null) }))
    cache.persistent.put(SERIALS_SNAPSHOT_KEY, encoded, SERIALS_SNAPSHOT_DOMAIN, SERIALS_SNAPSHOT_VARIANT, SERIALS_SNAPSHOT_ROW_TTL_MS)
}

internal suspend fun readSerialsSnapshot(cache: Cache): SerialsSnapshot? {
    val entry = cache.persistent.get(SERIALS_SNAPSHOT_KEY, SERIALS_SNAPSHOT_VARIANT) ?: return null
    return runCatching { serialDigestJson.decodeFromString(SerialsSnapshot.serializer(), entry.value) }.getOrNull()
}

// What the app just learned about one series, written into its row of the snapshot without touching
// `syncedAtEpochMs`. A series the snapshot does not hold, or no snapshot at all, is left alone: the
// next real sync brings it.
internal suspend fun mirrorIntoSerialsSnapshot(
    cache: Cache,
    seriesId: String,
    update: (SerialDigest.Success) -> SerialDigest.Success,
) {
    val snapshot = readSerialsSnapshot(cache) ?: return
    var changed = false
    val serials =
        snapshot.serials.map {
            if (it.id != seriesId) {
                it
            } else {
                update(it).also { updated -> changed = changed || updated != it }
            }
        }
    if (changed) writeSerialsSnapshot(cache, snapshot.copy(serials = serials))
}

// The series-level fields a fresh single-series fetch knows exactly (the list row carries the same).
// A date the fetch does not carry keeps the one the snapshot already had.
internal fun SerialDigest.Success.listFieldsFrom(fresh: SerialDigest.Success): SerialDigest.Success {
    val old = lastUpdatesUTC
    val new = fresh.lastUpdatesUTC
    val dates =
        if (new == null) {
            old
        } else {
            new.copy(
                series = new.series ?: old?.series,
                chapterAdded = new.chapterAdded ?: old?.chapterAdded,
                readDate = new.readDate ?: old?.readDate,
                created = new.created ?: old?.created,
            )
        }
    return copy(name = fresh.name, pages = fresh.pages ?: pages, lastUpdatesUTC = dates)
}
