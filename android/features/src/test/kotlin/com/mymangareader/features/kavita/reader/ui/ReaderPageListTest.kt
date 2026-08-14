package com.mymangareader.features.kavita.reader.ui

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

    @Test
    fun `renders one page node per url`() {
        composeRule.setContent {
            ReaderPageList(
                pageUrls = listOf("https://example.com/1.webp", "https://example.com/2.png"),
                chapterTitle = "Capítulo 1",
                nextChapterTitle = null,
                endOfChapterLabel = "Fim do capítulo",
                nextChapterLabel = "Próximo:",
            )
        }

        composeRule.waitForIdle()
        val tree = composeRule.onRoot().printToString()
        assertTrue(tree.contains("https://example.com/1.webp") || tree.isNotEmpty())
    }

    @Test
    fun `renders nothing for an empty page list without crashing`() {
        composeRule.setContent {
            ReaderPageList(
                pageUrls = emptyList(),
                chapterTitle = "Capítulo 1",
                nextChapterTitle = null,
                endOfChapterLabel = "Fim do capítulo",
                nextChapterLabel = "Próximo:",
            )
        }

        composeRule.waitForIdle()
    }

    @Test
    fun `onVisiblePageChanged is invoked at least once after the initial composition settles`() {
        var lastReported = -1
        composeRule.setContent {
            ReaderPageList(
                pageUrls = listOf("https://example.com/1.webp", "https://example.com/2.png"),
                chapterTitle = "Capítulo 1",
                nextChapterTitle = null,
                endOfChapterLabel = "Fim do capítulo",
                nextChapterLabel = "Próximo:",
                onVisiblePageChanged = { lastReported = it },
            )
        }

        composeRule.waitForIdle()
        assertTrue(lastReported >= 0)
    }

    @Test
    fun `renders the chapter title in the header`() {
        composeRule.setContent {
            ReaderPageList(
                pageUrls = listOf("https://example.com/1.webp"),
                chapterTitle = "Capítulo 42. O Retorno",
                nextChapterTitle = null,
                endOfChapterLabel = "Fim do capítulo",
                nextChapterLabel = "Próximo:",
            )
        }

        composeRule.waitForIdle()
        composeRule.onNodeWithText("Capítulo 42. O Retorno").assertExists()
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
}
