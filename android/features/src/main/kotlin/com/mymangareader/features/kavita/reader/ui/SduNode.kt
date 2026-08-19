package com.mymangareader.features.kavita.reader.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
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
        val heightPx: Int? = null,
        val paddingPx: Int = 0,
        val gapPx: Int = 0,
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
    ) : SduNode

    data class Spacer(val sizePx: Int) : SduNode
}

private fun parseColorOrNull(hex: String?): Color? =
    hex?.let { runCatching { Color(android.graphics.Color.parseColor(it)) }.getOrNull() }

/** Generic interpreter for [SduNode] — the only place that turns SDU data into actual Compose UI. */
@Composable
fun SduNodeView(node: SduNode) {
    when (node) {
        is SduNode.Container -> {
            val backgroundColor = parseColorOrNull(node.backgroundColor) ?: Color.Transparent
            val baseModifier = Modifier
                .fillMaxWidth()
                .background(backgroundColor)
                .then(if (node.heightPx != null) Modifier.height(node.heightPx.dp) else Modifier)
                .padding(PaddingValues(node.paddingPx.dp))
            if (node.direction == SduNode.Container.Direction.HORIZONTAL) {
                // Centered on the main axis by default (spacedBy + Alignment.CenterHorizontally)
                // — matches the Column branch below, where horizontalAlignment already centers
                // children on ITS cross axis. Without this, a Row's children default to the
                // start edge, which looked wrong for e.g. two texts meant to read as one
                // centered line ("Fim do capítulo 40").
                Row(
                    modifier = baseModifier,
                    horizontalArrangement = Arrangement.spacedBy(node.gapPx.dp, Alignment.CenterHorizontally),
                    verticalAlignment = node.align.toRowAlignment(),
                ) {
                    node.children.forEach { SduNodeView(it) }
                }
            } else {
                Column(
                    modifier = baseModifier,
                    verticalArrangement = Arrangement.spacedBy(node.gapPx.dp),
                    horizontalAlignment = node.align.toColumnAlignment(),
                ) {
                    node.children.forEach { SduNodeView(it) }
                }
            }
        }
        is SduNode.TextNode -> Text(
            text = node.text,
            color = parseColorOrNull(node.color) ?: Color.White,
            fontSize = node.fontSizeSp.sp,
            fontWeight = if (node.bold) FontWeight.SemiBold else FontWeight.Normal,
            textAlign = TextAlign.Center,
            maxLines = node.maxLines,
        )
        is SduNode.Spacer -> androidx.compose.foundation.layout.Spacer(
            modifier = if (node.sizePx > 0) Modifier.size(node.sizePx.dp) else Modifier,
        )
    }
}

private fun SduNode.Container.Align.toColumnAlignment(): Alignment.Horizontal = when (this) {
    SduNode.Container.Align.START -> Alignment.Start
    SduNode.Container.Align.CENTER -> Alignment.CenterHorizontally
    SduNode.Container.Align.END -> Alignment.End
}

private fun SduNode.Container.Align.toRowAlignment(): Alignment.Vertical = when (this) {
    SduNode.Container.Align.START -> Alignment.Top
    SduNode.Container.Align.CENTER -> Alignment.CenterVertically
    SduNode.Container.Align.END -> Alignment.Bottom
}
