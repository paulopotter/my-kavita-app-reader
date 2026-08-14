package com.mymangareader.features.kavita.reader.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImagePainter
import coil.compose.SubcomposeAsyncImage
import coil.compose.SubcomposeAsyncImageContent
import coil.request.ImageRequest

/**
 * One chapter's worth of content in the reader list. RN owns all navigation decisions (which
 * chapters are loaded, when the trio slides forward/back) — this is a dumb rendering unit: the
 * Kotlin/Compose side never decides chapter order or triggers navigation itself, it only draws
 * whatever list of blocks it's given and reports which page is visible via
 * [ReaderPageList]'s onVisiblePageChanged callback.
 */
data class ChapterBlock(
    val chapterId: String,
    val chapterTitle: String,
    val pageUrls: List<String>,
    val nextChapterTitle: String?,
    val endOfChapterLabel: String,
    val nextChapterLabel: String,
)

private sealed interface ListEntry {
    data class Header(val block: ChapterBlock) : ListEntry
    data class Page(val chapterId: String, val pageIndexInChapter: Int, val url: String) : ListEntry
    data class Footer(val block: ChapterBlock) : ListEntry
}

private fun flattenBlocks(blocks: List<ChapterBlock>): List<ListEntry> = blocks.flatMap { block ->
    buildList {
        add(ListEntry.Header(block))
        block.pageUrls.forEachIndexed { index, url -> add(ListEntry.Page(block.chapterId, index, url)) }
        add(ListEntry.Footer(block))
    }
}

private fun ListEntry.key(): String = when (this) {
    is ListEntry.Header -> "header:${block.chapterId}"
    is ListEntry.Page -> "page:$chapterId:$pageIndexInChapter"
    is ListEntry.Footer -> "footer:${block.chapterId}"
}

/**
 * Renders one or more chapters as a continuous vertical scroll, mirroring the reference
 * project's WebtoonColumn (my-manga-app-reader) — but blocks come entirely from RN via
 * [blocks], never decided here. SubcomposeAsyncImage + Modifier.fillMaxWidth() (no fixed
 * height) lets Compose's own draw pipeline handle tall webtoon pages without the
 * GL_MAX_TEXTURE_SIZE ceiling that a single classic-View ImageView hits — no manual bitmap
 * slicing needed.
 */
@Composable
fun ReaderPageList(
    blocks: List<ChapterBlock>,
    modifier: Modifier = Modifier,
    onVisiblePageChanged: (chapterId: String, pageIndex: Int) -> Unit = { _, _ -> },
) {
    val listState = rememberLazyListState()
    val context = LocalContext.current
    val preloader = remember { PagePreloader(context) }
    val entries = remember(blocks) { flattenBlocks(blocks) }
    val allPageUrls = remember(blocks) { blocks.flatMap { it.pageUrls } }

    DisposableEffect(Unit) {
        onDispose { preloader.clear() }
    }

    LaunchedEffect(listState, entries) {
        snapshotFlow { listState.firstVisibleItemIndex }
            .collect { firstVisibleItemIndex ->
                // The visible item can be a Header/Footer (e.g. right after opening the reader,
                // before any scroll) — fall through to the nearest Page at or after that index so
                // a chapter/page is always reported, matching "first page of this block is what's
                // effectively visible".
                val visibleEntry = entries.drop(firstVisibleItemIndex).firstOrNull { it is ListEntry.Page }
                    as? ListEntry.Page ?: return@collect
                onVisiblePageChanged(visibleEntry.chapterId, visibleEntry.pageIndexInChapter)

                val absoluteIndex = allPageUrls.indexOf(visibleEntry.url)
                if (absoluteIndex >= 0) {
                    preloader.updateWindow(computePreloadWindow(allPageUrls, absoluteIndex))
                }
            }
    }

    LazyColumn(state = listState, modifier = modifier.fillMaxSize()) {
        entries.forEach { entry ->
            item(key = entry.key()) {
                when (entry) {
                    is ListEntry.Header -> ChapterHeaderItem(chapterTitle = entry.block.chapterTitle)
                    is ListEntry.Page -> ReaderPageImage(url = entry.url)
                    is ListEntry.Footer -> ChapterFooterItem(
                        endOfChapterLabel = entry.block.endOfChapterLabel,
                        nextChapterLabel = entry.block.nextChapterLabel,
                        nextChapterTitle = entry.block.nextChapterTitle,
                    )
                }
            }
        }
    }
}

/** Mirrors the RN dummy ChapterHeader.tsx visual contract — black background, no series name yet. */
@Composable
internal fun ChapterHeaderItem(chapterTitle: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.Black)
            .padding(horizontal = 24.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            chapterTitle,
            color = Color.White,
            fontSize = 20.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
            maxLines = 2,
        )
    }
}

/** Mirrors the RN dummy ChapterFooter.tsx visual contract — end-of-chapter label + next preview. */
@Composable
internal fun ChapterFooterItem(
    endOfChapterLabel: String,
    nextChapterLabel: String,
    nextChapterTitle: String?,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.Black)
            .padding(horizontal = 24.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(endOfChapterLabel, color = ReaderMutedText, fontSize = 14.sp)
        if (nextChapterTitle != null) {
            Text(
                nextChapterLabel,
                color = ReaderMutedText,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 16.dp),
            )
            Text(
                nextChapterTitle,
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
                maxLines = 1,
            )
        }
    }
}

private val ReaderMutedText = Color(0xFFA0AEC0)

@Composable
internal fun ReaderPageImage(url: String) {
    SubcomposeAsyncImage(
        model = ImageRequest.Builder(LocalContext.current).data(url).build(),
        contentDescription = null,
        // Coil's default ContentScale.Fit keeps the image's own aspect ratio centered inside
        // the available width, which visually reads as black side bars whenever the decoded
        // image's aspect ratio doesn't exactly match the Box it's laid out in. FillWidth scales
        // the image to the full available width instead, matching the reference project.
        contentScale = ContentScale.FillWidth,
        modifier = Modifier.fillMaxWidth(),
    ) {
        when (painter.state) {
            is AsyncImagePainter.State.Loading, is AsyncImagePainter.State.Empty ->
                ReaderPagePlaceholder { CircularProgressIndicator(color = Color.White) }
            is AsyncImagePainter.State.Error ->
                ReaderPagePlaceholder { Text("Falha ao carregar página", color = Color.White) }
            is AsyncImagePainter.State.Success -> SubcomposeAsyncImageContent()
        }
    }
}

@Composable
private fun ReaderPagePlaceholder(content: @Composable () -> Unit) {
    Box(
        modifier = Modifier.fillMaxWidth().aspectRatio(2f / 3f),
        contentAlignment = Alignment.Center,
    ) {
        content()
    }
}
