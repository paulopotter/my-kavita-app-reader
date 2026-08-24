package com.mymangareader.contentdigest.chapter

import com.mymangareader.server.plugins.PluginChapter
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

// Guards against isCompleteForChapterDigest() (ChapterDigest.kt) silently going stale: if
// PluginChapter ever gains a new nullable field, this test discovers it (via .copy() against
// every known nullable property, not a hand-maintained duplicate list) and fails unless
// isCompleteForChapterDigest is updated to account for it too — catching the exact staleness
// risk flagged when the completeness check was designed (a field neither buildChapterDigest nor
// this check knows about would silently let an incomplete Series-supplied PluginChapter through
// as "complete").
//
// If PluginChapter gains a new nullable field, add it to `nullableFieldSetters` below AND to
// isCompleteForChapterDigest() — this test's only job is making sure nobody forgets the second
// half of that pair.
class PluginChapterCompletenessTest {

    private val fullyPopulated = PluginChapter(
        id = "c1", title = "Chapter 1", number = "1", pageCount = 2, pagesRead = 0, isSpecial = false,
        decimalNumber = 1.0, specialLabel = "1", createdUtc = "2026-01-01T00:00:00",
        lastReadingProgressUtc = "2026-01-02T00:00:00", fileFormat = "archive",
    )

    // Every nullable field isCompleteForChapterDigest() is expected to check — `number` is
    // deliberately excluded (it's genuinely optional, never read by buildChapterDigest).
    private val nullableFieldSetters: List<Pair<String, (PluginChapter) -> PluginChapter>> = listOf(
        "pageCount" to { c: PluginChapter -> c.copy(pageCount = null) },
        "pagesRead" to { c: PluginChapter -> c.copy(pagesRead = null) },
        "isSpecial" to { c: PluginChapter -> c.copy(isSpecial = null) },
        "decimalNumber" to { c: PluginChapter -> c.copy(decimalNumber = null) },
        "specialLabel" to { c: PluginChapter -> c.copy(specialLabel = null) },
        "createdUtc" to { c: PluginChapter -> c.copy(createdUtc = null) },
        "lastReadingProgressUtc" to { c: PluginChapter -> c.copy(lastReadingProgressUtc = null) },
        "fileFormat" to { c: PluginChapter -> c.copy(fileFormat = null) },
    )

    @Test
    fun `a fully populated PluginChapter is complete`() {
        assertTrue(fullyPopulated.isCompleteForChapterDigest())
    }

    @Test
    fun `every field isCompleteForChapterDigest checks, when null, makes PluginChapter incomplete`() {
        for ((fieldName, withFieldNulled) in nullableFieldSetters) {
            val incomplete = withFieldNulled(fullyPopulated)
            assertFalse("Expected isCompleteForChapterDigest() to be false when '$fieldName' is null", incomplete.isCompleteForChapterDigest())
        }
    }

    @Test
    fun `PluginChapter's own nullable field count matches this test's coverage, catching new fields`() {
        val declaredNullableFields = PluginChapter::class.java.declaredFields
            .filter { !it.isSynthetic && !it.type.isPrimitive && it.name != "id" && it.name != "title" }
            .map { it.name }
            .toSet()
        val coveredFields = (nullableFieldSetters.map { it.first } + "number").toSet()

        assertTrue(
            "PluginChapter has fields not covered by this test: ${declaredNullableFields - coveredFields}. " +
                "Add each to nullableFieldSetters above (and to isCompleteForChapterDigest() in ChapterDigest.kt, " +
                "unless the field is genuinely optional like 'number').",
            declaredNullableFields == coveredFields,
        )
    }
}
