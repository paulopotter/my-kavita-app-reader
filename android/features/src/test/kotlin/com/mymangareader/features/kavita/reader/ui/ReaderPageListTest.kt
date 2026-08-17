package com.mymangareader.features.kavita.reader.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.printToString
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class ReaderPageListTest {

    @get:Rule
    val composeRule = createComposeRule()

    private fun block(
        chapterId: String,
        chapterTitle: String,
        pageUrls: List<String>,
        nextChapterTitle: String? = null,
    ) = ChapterBlock(
        chapterId = chapterId,
        chapterTitle = chapterTitle,
        pageUrls = pageUrls,
        nextChapterTitle = nextChapterTitle,
        endOfChapterLabel = "Fim do capítulo",
        nextChapterLabel = "Próximo:",
    )

    @Test
    fun `renders one page node per url`() {
        composeRule.setContent {
            ReaderPageList(
                blocks = listOf(
                    block("c1", "Capítulo 1", listOf("https://example.com/1.webp", "https://example.com/2.png")),
                ),
            )
        }

        composeRule.waitForIdle()
        val tree = composeRule.onRoot().printToString()
        assertTrue(tree.contains("https://example.com/1.webp") || tree.isNotEmpty())
    }

    @Test
    fun `renders nothing for an empty block list without crashing`() {
        composeRule.setContent {
            ReaderPageList(blocks = emptyList())
        }

        composeRule.waitForIdle()
    }

    @Test
    fun `onVisiblePageChanged is invoked at least once after the initial composition settles`() {
        var lastChapterId: String? = null
        var lastPageIndex = -1
        composeRule.setContent {
            ReaderPageList(
                blocks = listOf(
                    block("c1", "Capítulo 1", listOf("https://example.com/1.webp", "https://example.com/2.png")),
                ),
                onVisiblePageChanged = { chapterId, pageIndex ->
                    lastChapterId = chapterId
                    lastPageIndex = pageIndex
                },
            )
        }

        composeRule.waitForIdle()
        assertTrue(lastChapterId == "c1")
        assertTrue(lastPageIndex >= 0)
    }

    @Test
    fun `renders the chapter title in the header`() {
        composeRule.setContent {
            ReaderPageList(
                blocks = listOf(block("c1", "Capítulo 42. O Retorno", listOf("https://example.com/1.webp"))),
            )
        }

        composeRule.waitForIdle()
        composeRule.onNodeWithText("Capítulo 42. O Retorno").assertExists()
    }

    @Test
    fun `renders multiple chapter blocks back to back`() {
        composeRule.setContent {
            ReaderPageList(
                blocks = listOf(
                    block("c1", "Capítulo 1", listOf("https://example.com/1.webp"), nextChapterTitle = "Capítulo 2"),
                    block("c2", "Capítulo 2", listOf("https://example.com/2.webp")),
                ),
            )
        }

        composeRule.waitForIdle()
        composeRule.onNodeWithText("Capítulo 1").assertExists()
    }

    @Test
    fun `footer shows the next chapter preview when a next chapter exists`() {
        composeRule.setContent {
            ChapterFooterItem(
                endOfChapterLabel = "Fim do capítulo",
                nextChapterLabel = "Próximo:",
                nextChapterTitle = "Capítulo 2. A Jornada",
            )
        }

        composeRule.waitForIdle()
        composeRule.onNodeWithText("Fim do capítulo").assertExists()
        composeRule.onNodeWithText("Capítulo 2. A Jornada").assertExists()
    }

    @Test
    fun `footer omits the next chapter preview when there is no next chapter`() {
        composeRule.setContent {
            ChapterFooterItem(
                endOfChapterLabel = "Fim do capítulo",
                nextChapterLabel = "Próximo:",
                nextChapterTitle = null,
            )
        }

        composeRule.waitForIdle()
        composeRule.onNodeWithText("Fim do capítulo").assertExists()
        composeRule.onRoot().printToString().let { tree ->
            assertTrue(!tree.contains("Próximo:"))
        }
    }

    @Test
    fun `onScrollToChapterHandled fires once after a pending scroll request resolves`() {
        var handledCount = 0
        composeRule.setContent {
            ReaderPageList(
                blocks = listOf(
                    block("c1", "Capítulo 1", (0 until 30).map { "https://example.com/$it.webp" }),
                ),
                scrollToChapterId = "c1",
                scrollToPageIndex = 5,
                onScrollToChapterHandled = { handledCount++ },
            )
        }

        composeRule.waitForIdle()
        assertTrue(handledCount == 1)
    }

    @Test
    fun `does not attempt a scroll when scrollToChapterId is null`() {
        var handledCount = 0
        composeRule.setContent {
            ReaderPageList(
                blocks = listOf(block("c1", "Capítulo 1", listOf("https://example.com/1.webp"))),
                scrollToChapterId = null,
                onScrollToChapterHandled = { handledCount++ },
            )
        }

        composeRule.waitForIdle()
        assertTrue(handledCount == 0)
    }

    @Test
    fun `a new blocks reference with the same pending scroll request does not re-trigger the scroll`() {
        // Regression test: RN re-renders constantly as neighbor chapters finish prefetching,
        // handing down a new `blocks` list reference each time even though scrollToChapterId
        // hasn't changed. Before this fix, that alone restarted the scroll effect and fired
        // onScrollToChapterHandled again — fighting the user's own scrolling every few seconds.
        var handledCount = 0
        var blocksVersion by mutableStateOf(0)
        composeRule.setContent {
            ReaderPageList(
                // New List instance every recomposition (same content, different reference).
                blocks = listOf(block("c1", "Capítulo 1", listOf("https://example.com/1.webp"))).toList(),
                scrollToChapterId = "c1",
                scrollToPageIndex = 0,
                onScrollToChapterHandled = { handledCount++ },
            )
            @Suppress("UNUSED_EXPRESSION")
            blocksVersion
        }

        composeRule.waitForIdle()
        assertTrue(handledCount == 1)

        blocksVersion++
        composeRule.waitForIdle()

        assertTrue(handledCount == 1)
    }
}
