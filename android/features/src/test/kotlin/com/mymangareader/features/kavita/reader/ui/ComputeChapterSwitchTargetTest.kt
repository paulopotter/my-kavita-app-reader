package com.mymangareader.features.kavita.reader.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Unit tests for the directional chapter-switch trigger (see its doc in ReaderPageList.kt for
 * the on-device asymmetry bug this fixes: scrolling down used to switch late, scrolling up used
 * to switch early, because both directions shared one midline measured relative to whichever
 * item already touched the viewport top).
 *
 * Fixture: three chapters (prev="p", curr="c", next="n"), each with ONE page 1000px tall, no
 * Header/Footer/Gap (firstNode/lastNode null) — keeps the entries list to exactly 3 Page entries
 * (indices 0/1/2) so viewport math is easy to reason about. viewportEndOffset is fixed at
 * 2000px, so the quarter lines are 500/1000/1500.
 *
 * Position convention (matches computeVisiblePageAndFraction/computeChapterFraction elsewhere in
 * this file): zero is the TOP of firstVisibleItemIndex; firstVisibleItemScrollOffset is how far
 * the viewport has scrolled INTO that item (positive = scrolled past its top, i.e. that item's
 * top is ABOVE the viewport's own top edge by that many px).
 */
class ComputeChapterSwitchTargetTest {

    private val viewportEndOffset = 2000

    private fun block(chapterId: String) = ChapterBlock(
        chapterId = chapterId,
        pageUrls = listOf("https://example.com/$chapterId.webp"),
        pageAspectRatios = emptyList(),
        firstNode = null,
        lastNode = null,
    )

    // entries = [Page(p,0), Page(c,0), Page(n,0)] — indices 0, 1, 2.
    private val entries = flattenBlocks(listOf(block("p"), block("c"), block("n")))
    private val itemHeights: Map<String, Int> = entries.associate { it.key() to 1000 }

    // --- Scrolling DOWN: firstVisibleItemIndex stays on curr (1), offset grows as the user
    // scrolls further into/past it, bringing next's top (1000px below curr's own top) closer. ---

    @Test
    fun `scrolling down switches to next once its first page top crosses into the 25-50 percent band`() {
        // next's top = curr's height(1000) - offset(250) = 750, inside [500,1000].
        val target = computeChapterSwitchTarget(
            entries = entries, itemHeights = itemHeights, currentChapterId = "c",
            firstVisibleItemIndex = 1, firstVisibleItemScrollOffset = 250,
            viewportEndOffset = viewportEndOffset, scrollingDown = true,
        )
        assertEquals("n", target)
    }

    @Test
    fun `scrolling down does not switch while next chapter's top has not reached the 25 percent line yet`() {
        // next's top = 1000 - 100 = 900, outside [500,1000)? 900 is inside actually — use a
        // smaller offset so next's top stays above (before) the band entirely.
        val target = computeChapterSwitchTarget(
            entries = entries, itemHeights = itemHeights, currentChapterId = "c",
            firstVisibleItemIndex = 1, firstVisibleItemScrollOffset = -600,
            // next's top = 1000 - (-600) = 1600, past the 50% line already (never crossed 25-50 from this side)
            viewportEndOffset = viewportEndOffset, scrollingDown = true,
        )
        assertNull(target)
    }

    @Test
    fun `scrolling down does not switch once next chapter's top has passed the 25 percent line`() {
        // next's top = 1000 - 600 = 400, before (past) the 25% line — chapter should have
        // already switched by now, this trigger no longer considers "c" the current chapter in
        // practice, but the function itself just reports null for out-of-band values.
        val target = computeChapterSwitchTarget(
            entries = entries, itemHeights = itemHeights, currentChapterId = "c",
            firstVisibleItemIndex = 1, firstVisibleItemScrollOffset = 600,
            viewportEndOffset = viewportEndOffset, scrollingDown = true,
        )
        assertNull(target)
    }

    // --- Scrolling UP: firstVisibleItemIndex is prev (0) — the physically correct state once
    // the user has scrolled back far enough for prev's page to touch the viewport's top edge. ---

    @Test
    fun `scrolling up switches to previous once its last page bottom crosses into the 50-75 percent band`() {
        // firstVisibleItemIndex=prev(0). prev's own bottom = prev's height(1000) - offset.
        // offset=-250 -> bottom = 1250, inside [1000,1500].
        val target = computeChapterSwitchTarget(
            entries = entries, itemHeights = itemHeights, currentChapterId = "c",
            firstVisibleItemIndex = 0, firstVisibleItemScrollOffset = -250,
            viewportEndOffset = viewportEndOffset, scrollingDown = false,
        )
        assertEquals("p", target)
    }

    @Test
    fun `scrolling up does not switch while previous chapter's bottom has not entered the band yet`() {
        // bottom = 1000 - (-1000) = 2000, past the 75% line — hasn't crossed to inside the band
        // (from below, i.e. still fully off-screen further down would be a different sign; this
        // represents "prev's bottom is way past 75%, deep in view already" which shouldn't re-fire).
        val target = computeChapterSwitchTarget(
            entries = entries, itemHeights = itemHeights, currentChapterId = "c",
            firstVisibleItemIndex = 0, firstVisibleItemScrollOffset = 600,
            // bottom = 1000 - 600 = 400, before the 50% line
            viewportEndOffset = viewportEndOffset, scrollingDown = false,
        )
        assertNull(target)
    }

    @Test
    fun `scrolling up does not switch once previous chapter's bottom has passed the 75 percent line`() {
        val target = computeChapterSwitchTarget(
            entries = entries, itemHeights = itemHeights, currentChapterId = "c",
            firstVisibleItemIndex = 0, firstVisibleItemScrollOffset = -600,
            // bottom = 1000 - (-600) = 1600, past 75% (1500)
            viewportEndOffset = viewportEndOffset, scrollingDown = false,
        )
        assertNull(target)
    }

    @Test
    fun `returns null when there is no next chapter to switch to while scrolling down`() {
        val onlyTwo = flattenBlocks(listOf(block("p"), block("c")))
        val heights = onlyTwo.associate { it.key() to 1000 }
        val target = computeChapterSwitchTarget(
            entries = onlyTwo, itemHeights = heights, currentChapterId = "c",
            firstVisibleItemIndex = 1, firstVisibleItemScrollOffset = 250,
            viewportEndOffset = viewportEndOffset, scrollingDown = true,
        )
        assertNull(target)
    }

    @Test
    fun `returns null when there is no previous chapter to switch to while scrolling up`() {
        val onlyTwo = flattenBlocks(listOf(block("c"), block("n")))
        val heights = onlyTwo.associate { it.key() to 1000 }
        val target = computeChapterSwitchTarget(
            entries = onlyTwo, itemHeights = heights, currentChapterId = "c",
            firstVisibleItemIndex = 0, firstVisibleItemScrollOffset = -250,
            viewportEndOffset = viewportEndOffset, scrollingDown = false,
        )
        assertNull(target)
    }

    @Test
    fun `returns null when a needed landmark is not measured yet`() {
        val incompleteHeights = itemHeights - entries[0].key() // prev chapter's page height missing
        val target = computeChapterSwitchTarget(
            entries = entries, itemHeights = incompleteHeights, currentChapterId = "c",
            firstVisibleItemIndex = 0, firstVisibleItemScrollOffset = -250,
            viewportEndOffset = viewportEndOffset, scrollingDown = false,
        )
        assertNull(target)
    }

    @Test
    fun `matches the exact on-device scenario that used to false-trigger mid-chapter`() {
        // Regression test for reader-log-v53.txt: a 3-chapter trio (20504/20616/20829), each
        // chapter's Header/Footer measured (337-575px), firstVisibleItemIndex sitting on curr's
        // SECOND page (index 18 in the real entries list, offset 4326px into a 10800px-tall
        // page) — nowhere near either chapter boundary. The buggy version reported a switch to
        // the previous chapter here; the fix must report null.
        val realish = flattenBlocks(
            listOf(
                ChapterBlock(
                    chapterId = "prev", pageUrls = List(14) { "url$it" },
                    pageAspectRatios = emptyList(),
                    firstNode = SduNode.Container(children = emptyList()),
                    lastNode = SduNode.Container(children = emptyList()),
                ),
                ChapterBlock(
                    chapterId = "curr", pageUrls = List(16) { "url$it" },
                    pageAspectRatios = emptyList(),
                    firstNode = SduNode.Container(children = emptyList()),
                    lastNode = SduNode.Container(children = emptyList()),
                ),
            ),
        )
        val heights = HashMap<String, Int>()
        realish.forEach { entry ->
            heights[entry.key()] = when {
                entry.key() == "first:prev" -> 400
                entry.key() == "last:prev" -> 337
                entry.key() == "first:curr" -> 575
                entry.key().startsWith("page:prev") -> 1000
                entry.key() == "page:curr:0" -> 1620
                entry.key() == "page:curr:1" -> 10800
                else -> 1000
            }
        }
        // index of page:curr:1 (second page of curr): first:prev(1) + 14 prev pages + last:prev(1) + first:curr(1) + page:curr:0(1) = 18
        val currSecondPageIndex = realish.indexOfFirst { it.key() == "page:curr:1" }
        assertEquals(18, currSecondPageIndex)

        val target = computeChapterSwitchTarget(
            entries = realish, itemHeights = heights, currentChapterId = "curr",
            firstVisibleItemIndex = currSecondPageIndex, firstVisibleItemScrollOffset = 4326,
            viewportEndOffset = 2546, scrollingDown = false,
        )
        assertNull(target)
    }
}
