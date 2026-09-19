package com.mymangareader.features.kavita.reader.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Server-Driven UI node: describes non-page content (what used to be the fixed Header/Footer/Gap
 * Composables) as data RN sends over the bridge, rather than as Kotlin-hardcoded layout. Kotlin's
 * only job is to interpret this tree generically ([SduNodeView]) — it never encodes what a
 * "header" or "footer" IS, only how to draw a container/text/spacer. Any new visual composition
 * (two differently-styled texts stacked, a colored band, a divider) is expressible purely as data
 * from RN, with zero Kotlin changes — that's the whole point of this being SDU rather than a
 * fixed HeaderSpec/FooterSpec shape.
 *
 * Deliberately flat/simple beyond the container/text/spacer trio — extend with new sealed
 * subtypes (e.g. Icon) only when a real need shows up, not speculatively.
 */
sealed interface SduNode {
    data class Container(
        val direction: Direction = Direction.VERTICAL,
        val backgroundColor: String? = null,
        val heightDp: Int? = null,
        val paddingDp: Int = 0,
        val gapDp: Int = 0,
        val align: Align = Align.CENTER,
        val children: List<SduNode> = emptyList(),
    ) : SduNode {
        enum class Direction { VERTICAL, HORIZONTAL }

        enum class Align { START, CENTER, END }
    }

    data class TextNode(
        val text: String,
        val color: String = "#FFFFFF",
        val fontSizeSp: Int = 14,
        val bold: Boolean = false,
        val maxLines: Int = Int.MAX_VALUE,
        /**
         * A token inside [text] to be replaced before drawing, e.g. "{code}". Kotlin substitutes
         * it generically — it never learns what the value MEANS, only that the caller asked for a
         * swap — so the wording and the placement of the value stay with the language, not here.
         */
        val placeholder: String? = null,
    ) : SduNode

    data class Spacer(
        val sizeDp: Int,
    ) : SduNode

    /** An indeterminate progress indicator — what a page shows while its image loads. */
    data class Spinner(
        val color: String = "#FFFFFF",
        /** Diameter in dp. Compose's default fills whatever it is given, which inside a page-sized
         *  placeholder reads as a stretched ring rather than a spinner. */
        val sizeDp: Int = 48,
    ) : SduNode

    /**
     * A tappable region. [action] names what was tapped, so the interpreter's caller can decide
     * what it does; the node itself carries no behaviour. Today the reader binds "retry" to
     * re-requesting a failed page, which is a Compose-local concern — no event crosses to RN.
     */
    data class Pressable(
        val action: String,
        val backgroundColor: String? = null,
        val cornerRadiusDp: Int = 0,
        val paddingHorizontalDp: Int = 0,
        val paddingVerticalDp: Int = 0,
        val children: List<SduNode> = emptyList(),
    ) : SduNode
}

private fun parseColorOrNull(hex: String?): Color? = hex?.let { runCatching { Color(android.graphics.Color.parseColor(it)) }.getOrNull() }

/**
 * Generic interpreter for [SduNode] — the only place that turns SDU data into actual Compose UI.
 *
 * @param substitution replaces a [SduNode.TextNode.placeholder] wherever one is declared. The
 *   interpreter does not know what the value stands for; the caller does.
 * @param onAction invoked with a [SduNode.Pressable]'s own action name when it is tapped.
 */
@Composable
fun SduNodeView(
    node: SduNode,
    substitution: String? = null,
    onAction: (String) -> Unit = {},
) {
    when (node) {
        is SduNode.Container -> {
            val backgroundColor = parseColorOrNull(node.backgroundColor) ?: Color.Transparent
            val baseModifier =
                Modifier
                    .fillMaxWidth()
                    .background(backgroundColor)
                    .then(if (node.heightDp != null) Modifier.height(node.heightDp.dp) else Modifier)
                    .padding(PaddingValues(node.paddingDp.dp))
            if (node.direction == SduNode.Container.Direction.HORIZONTAL) {
                // Centered on the main axis by default (spacedBy + Alignment.CenterHorizontally)
                // — matches the Column branch below, where horizontalAlignment already centers
                // children on ITS cross axis. Without this, a Row's children default to the
                // start edge, which looked wrong for e.g. two texts meant to read as one
                // centered line ("Fim do capítulo 40").
                Row(
                    modifier = baseModifier,
                    horizontalArrangement = Arrangement.spacedBy(node.gapDp.dp, Alignment.CenterHorizontally),
                    verticalAlignment = node.align.toRowAlignment(),
                ) {
                    node.children.forEach { SduNodeView(it, substitution, onAction) }
                }
            } else {
                Column(
                    modifier = baseModifier,
                    verticalArrangement = Arrangement.spacedBy(node.gapDp.dp),
                    horizontalAlignment = node.align.toColumnAlignment(),
                ) {
                    node.children.forEach { SduNodeView(it, substitution, onAction) }
                }
            }
        }
        is SduNode.TextNode ->
            Text(
                text =
                    if (node.placeholder != null && substitution != null) {
                        node.text.replace(node.placeholder, substitution)
                    } else {
                        node.text
                    },
                color = parseColorOrNull(node.color) ?: Color.White,
                fontSize = node.fontSizeSp.sp,
                fontWeight = if (node.bold) FontWeight.SemiBold else FontWeight.Normal,
                textAlign = TextAlign.Center,
                maxLines = node.maxLines,
            )
        is SduNode.Spacer ->
            androidx.compose.foundation.layout.Spacer(
                modifier = if (node.sizeDp > 0) Modifier.size(node.sizeDp.dp) else Modifier,
            )
        is SduNode.Spinner ->
            CircularProgressIndicator(
                color = parseColorOrNull(node.color) ?: Color.White,
                modifier = Modifier.size(node.sizeDp.dp),
            )
        is SduNode.Pressable ->
            Box(
                modifier =
                    Modifier
                        .background(
                            parseColorOrNull(node.backgroundColor) ?: Color.Transparent,
                            RoundedCornerShape(node.cornerRadiusDp.dp),
                        ).clickable { onAction(node.action) }
                        .padding(
                            horizontal = node.paddingHorizontalDp.dp,
                            vertical = node.paddingVerticalDp.dp,
                        ),
            ) {
                node.children.forEach { SduNodeView(it, substitution, onAction) }
            }
    }
}

private fun SduNode.Container.Align.toColumnAlignment(): Alignment.Horizontal =
    when (this) {
        SduNode.Container.Align.START -> Alignment.Start
        SduNode.Container.Align.CENTER -> Alignment.CenterHorizontally
        SduNode.Container.Align.END -> Alignment.End
    }

private fun SduNode.Container.Align.toRowAlignment(): Alignment.Vertical =
    when (this) {
        SduNode.Container.Align.START -> Alignment.Top
        SduNode.Container.Align.CENTER -> Alignment.CenterVertically
        SduNode.Container.Align.END -> Alignment.Bottom
    }
