package com.mymangareader.contentdigest.serial

import com.mymangareader.cache.Cache
import com.mymangareader.cache.CacheDescriptor
import com.mymangareader.cache.CacheEntry
import com.mymangareader.contentdigest.chapter.ChapterDigest
import com.mymangareader.contentdigest.chapter.ChapterFields
import kotlinx.serialization.Serializable

// A series cached as ONE row carries every chapter inside it, so its size grows with the chapter
// count: a manga with thousands of chapters outgrew what a cache row can hold (see
// CACHE_MAX_VALUE_BYTES in :cache) and could no longer be cached or read at all. A big series is
// therefore stored as a main row WITHOUT its chapter list plus the chapters in separate segment rows:
//
//   <key>            the SerialDigest with chapters.list = [] (total/readCount/resumePoint stay)
//   <key>:seg:index  { resolvedAtEpochMs, counts: [chapters per segment] }
//   <key>:seg:<k>    { resolvedAtEpochMs, list: [ChapterDigest, ...] }
//
// A main row whose list is empty but whose total is not IS the split form; anything else (small
// series, rows seeded by the Library list) stays exactly as before, so old rows keep reading.
// Segments live in the same domain (retention and domain invalidation reach them, and the key keeps
// the series id as its prefix) but in their own variant, so the Library's wide read of the main
// variant never touches them.
//
// The main row is written LAST: it is the commit marker. The index and every segment carry the same
// resolvedAtEpochMs (the write's own), and a read that finds any of them missing or from another
// write — or a chapter total that disagrees with the main row — treats the whole series as a miss
// (it is then rebuilt) instead of mixing two generations of the chapter list. The generation is NOT
// checked against the main row's own resolvedAtEpochMs: the Library's list refresh merges into that
// very row and overwrites it, without touching the chapters.
internal const val SERIAL_SEGMENT_VARIANT = "chapters"

// Chars, not bytes (UTF-8 is at most 3 bytes per char), and both far enough under
// CACHE_MAX_VALUE_BYTES (1.5 MB) to hold even for a worst-case alphabet.
internal const val SERIAL_INLINE_MAX_CHARS = 400_000
internal const val SERIAL_SEGMENT_TARGET_CHARS = 450_000

/** Logcat tag of the series cache's few, per-call diagnostic lines (never per chapter). */
internal const val SERIAL_LOG_TAG = "SerialDigest"

// A line per series read/write so a slow or cold open of a huge series can be told apart on the
// device: cache hit or miss, how long each part took, how it was stored. runCatching because the
// unit tests run against a stub android.util.Log.
internal fun serialLog(message: String) {
    runCatching { android.util.Log.i(SERIAL_LOG_TAG, message) }
}

@Serializable
private data class SegmentIndex(
    val resolvedAtEpochMs: Long,
    val counts: List<Int>,
)

@Serializable
private data class SegmentBody(
    val resolvedAtEpochMs: Long,
    val list: List<ChapterDigest>,
)

internal fun segmentIndexKey(key: String) = "$key:seg:index"

internal fun segmentKey(
    key: String,
    index: Int,
) = "$key:seg:$index"

private fun SerialFields.Chapters.isSplit() = list.isEmpty() && total > 0

/** A series row as read back: the digest with its chapters in place, and the main row's cache entry. */
internal class SerialRow(
    val digest: SerialDigest.Success,
    val entry: CacheEntry,
)

/**
 * Writes [digest] under [key]: as one row when it is small, otherwise split (see the header). Returns
 * the descriptor of the main row.
 */
internal suspend fun persistSerialDigest(
    cache: Cache,
    key: String,
    digest: SerialDigest.Success,
    variant: String = SERIAL_CACHE_VARIANT,
): CacheDescriptor {
    val startedAt = System.nanoTime()
    val inline = serialDigestJson.encodeToString(SerialDigest.Success.serializer(), digest)
    val chapters = digest.chapters
    if (chapters == null || chapters.list.isEmpty() || inline.length <= SERIAL_INLINE_MAX_CHARS) {
        return cache.persistent.put(key, inline, SERIAL_CACHE_DOMAIN, variant = variant).also {
            serialLog("persist key=$key inline chars=${inline.length} chapters=${chapters?.list?.size ?: 0} ms=${(System.nanoTime() - startedAt) / 1_000_000}")
        }
    }

    // Greedy grouping by encoded size, so a series of long chapters (or one carrying page lists)
    // gets fewer chapters per segment instead of a segment that is too big to read back.
    val groups = ArrayList<List<String>>()
    var current = ArrayList<String>()
    var currentChars = 0
    for (chapter in chapters.list) {
        val encoded = serialDigestJson.encodeToString(ChapterDigest.serializer(), chapter)
        if (current.isNotEmpty() && currentChars + encoded.length > SERIAL_SEGMENT_TARGET_CHARS) {
            groups.add(current)
            current = ArrayList()
            currentChars = 0
        }
        current.add(encoded)
        currentChars += encoded.length
    }
    if (current.isNotEmpty()) groups.add(current)

    val resolved = digest.resolvedAtEpochMs
    groups.forEachIndexed { index, group ->
        // Joined by hand: the chapters are already encoded, no reason to encode them twice.
        val body = "{\"resolvedAtEpochMs\":$resolved,\"list\":[${group.joinToString(",")}]}"
        cache.persistent.put(segmentKey(key, index), body, SERIAL_CACHE_DOMAIN, variant = SERIAL_SEGMENT_VARIANT)
    }
    cache.persistent.put(
        segmentIndexKey(key),
        serialDigestJson.encodeToString(SegmentIndex.serializer(), SegmentIndex(resolved, groups.map { it.size })),
        SERIAL_CACHE_DOMAIN,
        variant = SERIAL_SEGMENT_VARIANT,
    )
    val main = digest.copy(chapters = chapters.copy(list = emptyList()))
    return cache.persistent.put(key, serialDigestJson.encodeToString(SerialDigest.Success.serializer(), main), SERIAL_CACHE_DOMAIN, variant = variant).also {
        serialLog("persist key=$key segments=${groups.size} chapters=${chapters.list.size} chars=${inline.length} ms=${(System.nanoTime() - startedAt) / 1_000_000}")
    }
}

/**
 * Reads the series row under [key] with its chapters in place, whichever form it was stored in.
 * null when there is no row, it cannot be decoded, or a split row is missing a part: a miss, the
 * caller rebuilds it.
 */
internal suspend fun readSerialRow(
    cache: Cache,
    key: String,
    variant: String = SERIAL_CACHE_VARIANT,
): SerialRow? {
    val entry = cache.persistent.get(key, variant) ?: return null
    val digest = runCatching { serialDigestJson.decodeFromString(SerialDigest.Success.serializer(), entry.value) }.getOrNull() ?: return null
    val chapters = digest.chapters
    if (chapters == null || !chapters.isSplit()) return SerialRow(digest, entry)

    val index = readIndex(cache, key) ?: return null
    val all = ArrayList<ChapterDigest>(chapters.total)
    for (position in index.counts.indices) {
        all.addAll((readSegment(cache, key, position, index) ?: return null).list)
    }
    if (all.size != chapters.total) return null
    return SerialRow(digest.copy(chapters = chapters.copy(list = all)), entry)
}

private suspend fun readIndex(
    cache: Cache,
    key: String,
): SegmentIndex? {
    val raw = cache.persistent.get(segmentIndexKey(key), SERIAL_SEGMENT_VARIANT)?.value ?: return null
    return runCatching { serialDigestJson.decodeFromString(SegmentIndex.serializer(), raw) }.getOrNull()
}

private suspend fun readSegment(
    cache: Cache,
    key: String,
    position: Int,
    index: SegmentIndex,
): SegmentBody? {
    val raw = cache.persistent.get(segmentKey(key, position), SERIAL_SEGMENT_VARIANT)?.value ?: return null
    val body = runCatching { serialDigestJson.decodeFromString(SegmentBody.serializer(), raw) }.getOrNull() ?: return null
    return body.takeIf { it.resolvedAtEpochMs == index.resolvedAtEpochMs && it.list.size == index.counts[position] }
}

/**
 * Sets one chapter's readStatus inside the series row under [key], whichever form it is stored in,
 * and keeps chapters.readCount in step. Only the part that holds the chapter is rewritten (plus the
 * main row), so marking a chapter on a huge series does not rewrite its whole chapter list.
 * Returns false when there is nothing to change: no such row, chapter not in it, or already that status.
 */
internal suspend fun patchSerialRowChapter(
    cache: Cache,
    key: String,
    chapterId: String,
    readStatus: ChapterFields.ReadStatus,
    variant: String = SERIAL_CACHE_VARIANT,
): Boolean {
    val entry = cache.persistent.get(key, variant) ?: return false
    val digest = runCatching { serialDigestJson.decodeFromString(SerialDigest.Success.serializer(), entry.value) }.getOrNull() ?: return false
    val chapters = digest.chapters ?: return false

    if (!chapters.isSplit()) {
        var changed = false
        val patchedList =
            chapters.list.map { chapter ->
                if (chapter is ChapterDigest.Success && chapter.id == chapterId && chapter.readStatus != readStatus) {
                    changed = true
                    chapter.copy(readStatus = readStatus)
                } else {
                    chapter
                }
            }
        if (!changed) return false
        val readCount = patchedList.count { it is ChapterDigest.Success && it.readStatus == ChapterFields.ReadStatus.READ }
        persistSerialDigest(cache, key, digest.copy(chapters = chapters.copy(list = patchedList, readCount = readCount)), variant)
        return true
    }

    val index = readIndex(cache, key) ?: return false
    for (position in index.counts.indices) {
        val body = readSegment(cache, key, position, index) ?: return false
        val at = body.list.indexOfFirst { it is ChapterDigest.Success && it.id == chapterId }
        if (at < 0) continue
        val target = body.list[at] as ChapterDigest.Success
        if (target.readStatus == readStatus) return false

        val patchedList = body.list.toMutableList().also { it[at] = target.copy(readStatus = readStatus) }
        cache.persistent.put(
            segmentKey(key, position),
            serialDigestJson.encodeToString(SegmentBody.serializer(), body.copy(list = patchedList)),
            SERIAL_CACHE_DOMAIN,
            variant = SERIAL_SEGMENT_VARIANT,
        )
        val delta =
            (if (readStatus == ChapterFields.ReadStatus.READ) 1 else 0) -
                (if (target.readStatus == ChapterFields.ReadStatus.READ) 1 else 0)
        val patchedMain = digest.copy(chapters = chapters.copy(readCount = chapters.readCount?.plus(delta)))
        cache.persistent.put(key, serialDigestJson.encodeToString(SerialDigest.Success.serializer(), patchedMain), SERIAL_CACHE_DOMAIN, variant = variant)
        return true
    }
    return false
}
