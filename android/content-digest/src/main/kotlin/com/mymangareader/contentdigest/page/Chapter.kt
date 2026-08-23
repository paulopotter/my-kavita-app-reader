package com.mymangareader.contentdigest.page

// Task-018-only placeholder — NOT the real ChapterContract/ChapterDigest, which doesn't exist yet
// (Task 019). PageDigest.Success.chapter is populated by handing this exact object back
// unchanged (see PageDigest.kt) — Page never re-shapes/filters a caller-supplied parameter, same
// treatment ServerActiveInfo already gets for the `server` field. Only `id`/`serial.id` are
// actually read by buildPageDigest (to call Server.serial(chapter.serial.id).chapter(chapter.id))
// — any other field a caller adds here is simply carried through, unused by Page.
//
// PENDING: once Task 019 (Chapter) and Task 020 (Series) build the real ChapterDigest/
// SeriesDigest, come back and correct this type's fields to match whatever shape they turn out
// to be — do not leave Page silently pointing at this minimal placeholder once the real type
// exists.
data class Chapter(
    val id: String,
    val serial: Serial,
) {
    data class Serial(val id: String)
}
