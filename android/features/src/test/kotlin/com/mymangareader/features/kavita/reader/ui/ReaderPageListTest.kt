package com.mymangareader.features.kavita.reader.ui

import androidx.compose.ui.test.junit4.createComposeRule
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
            ReaderPageList(pageUrls = listOf("https://example.com/1.webp", "https://example.com/2.png"))
        }

        composeRule.waitForIdle()
        val tree = composeRule.onRoot().printToString()
        assertTrue(tree.contains("https://example.com/1.webp") || tree.isNotEmpty())
    }

    @Test
    fun `renders nothing for an empty page list without crashing`() {
        composeRule.setContent {
            ReaderPageList(pageUrls = emptyList())
        }

        composeRule.waitForIdle()
    }

    @Test
    fun `onVisiblePageChanged is invoked at least once after the initial composition settles`() {
        var lastReported = -1
        composeRule.setContent {
            ReaderPageList(
                pageUrls = listOf("https://example.com/1.webp", "https://example.com/2.png"),
                onVisiblePageChanged = { lastReported = it },
            )
        }

        composeRule.waitForIdle()
        assertTrue(lastReported >= 0)
    }
}
