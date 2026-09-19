package com.mymangareader.features.kavita.reader.ui

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class SduNodeTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun `container with two differently styled texts renders both`() {
        // The exact scenario that motivated SDU: two texts in the same container with different
        // color/size, expressed purely as data RN sends — no Kotlin change needed to add this.
        composeRule.setContent {
            SduNodeView(
                SduNode.Container(
                    backgroundColor = "#000000",
                    children =
                        listOf(
                            SduNode.TextNode(text = "Capítulo 41", color = "#FFFFFF", fontSizeSp = 20, bold = true),
                            SduNode.TextNode(text = "One Piece", color = "#A0AEC0", fontSizeSp = 13),
                        ),
                ),
            )
        }

        composeRule.waitForIdle()
        composeRule.onNodeWithText("Capítulo 41").assertExists()
        composeRule.onNodeWithText("One Piece").assertExists()
    }

    @Test
    fun `nested containers render recursively`() {
        composeRule.setContent {
            SduNodeView(
                SduNode.Container(
                    children =
                        listOf(
                            SduNode.Container(
                                direction = SduNode.Container.Direction.HORIZONTAL,
                                children =
                                    listOf(
                                        SduNode.TextNode(text = "left"),
                                        SduNode.TextNode(text = "right"),
                                    ),
                            ),
                        ),
                ),
            )
        }

        composeRule.waitForIdle()
        composeRule.onNodeWithText("left").assertExists()
        composeRule.onNodeWithText("right").assertExists()
    }

    @Test
    fun `an invalid color falls back to a default instead of crashing`() {
        composeRule.setContent {
            SduNodeView(SduNode.TextNode(text = "hello", color = "not-a-color"))
        }

        composeRule.waitForIdle()
        composeRule.onNodeWithText("hello").assertExists()
    }

    @Test
    fun `a spacer renders without content`() {
        composeRule.setContent {
            SduNodeView(SduNode.Spacer(sizeDp = 48))
        }

        composeRule.waitForIdle()
    }

    @Test
    fun `a text node swaps its declared placeholder for the substitution`() {
        composeRule.setContent {
            SduNodeView(
                node = SduNode.TextNode(text = "Falha ao carregar página ({code})", placeholder = "{code}"),
                substitution = "-1",
            )
        }

        composeRule.waitForIdle()
        composeRule.onNodeWithText("Falha ao carregar página (-1)").assertExists()
    }

    @Test
    fun `a text node keeps its placeholder when there is nothing to substitute`() {
        // A network failure has no code to show, so the token stays — the wording is still legible.
        composeRule.setContent {
            SduNodeView(
                node = SduNode.TextNode(text = "Falha ({code})", placeholder = "{code}"),
                substitution = null,
            )
        }

        composeRule.waitForIdle()
        composeRule.onNodeWithText("Falha ({code})").assertExists()
    }

    @Test
    fun `a text node without a declared placeholder is left alone`() {
        composeRule.setContent {
            SduNodeView(node = SduNode.TextNode(text = "Fim do capítulo"), substitution = "-1")
        }

        composeRule.waitForIdle()
        composeRule.onNodeWithText("Fim do capítulo").assertExists()
    }

    @Test
    fun `a pressable reports its own action name when tapped`() {
        var fired: String? = null
        composeRule.setContent {
            SduNodeView(
                node =
                    SduNode.Pressable(
                        action = "retry",
                        children = listOf(SduNode.TextNode(text = "Tentar novamente")),
                    ),
                onAction = { fired = it },
            )
        }

        composeRule.waitForIdle()
        composeRule.onNodeWithText("Tentar novamente").performClick()
        assertEquals("retry", fired)
    }

    @Test
    fun `a spinner renders without content`() {
        composeRule.setContent {
            SduNodeView(SduNode.Spinner(color = "#FF0000"))
        }

        composeRule.waitForIdle()
        assertTrue(true)
    }

    @Test
    fun `an empty container renders without crashing`() {
        composeRule.setContent {
            SduNodeView(SduNode.Container())
        }

        composeRule.waitForIdle()
        assertTrue(true)
    }
}
