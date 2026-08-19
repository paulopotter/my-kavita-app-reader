package com.mymangareader.features.kavita.reader.ui

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
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
                    children = listOf(
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
                    children = listOf(
                        SduNode.Container(
                            direction = SduNode.Container.Direction.HORIZONTAL,
                            children = listOf(
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
            SduNodeView(SduNode.Spacer(sizePx = 48))
        }

        composeRule.waitForIdle()
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
