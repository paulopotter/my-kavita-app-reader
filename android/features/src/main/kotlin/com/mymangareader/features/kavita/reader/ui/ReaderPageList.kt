package com.mymangareader.features.kavita.reader.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
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
import coil.request.CachePolicy
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
    data class Gap(val afterChapterId: String, val beforeChapterId: String) : ListEntry
}

private fun flattenBlocks(blocks: List<ChapterBlock>): List<ListEntry> = buildList {
    blocks.forEachIndexed { index, block ->
        if (index > 0) {
            add(ListEntry.Gap(afterChapterId = blocks[index - 1].chapterId, beforeChapterId = block.chapterId))
        }
        add(ListEntry.Header(block))
        block.pageUrls.forEachIndexed { pageIndex, url -> add(ListEntry.Page(block.chapterId, pageIndex, url)) }
        add(ListEntry.Footer(block))
    }
}

private fun ListEntry.key(): String = when (this) {
    is ListEntry.Header -> "header:${block.chapterId}"
    is ListEntry.Page -> "page:$chapterId:$pageIndexInChapter"
    is ListEntry.Footer -> "footer:${block.chapterId}"
    is ListEntry.Gap -> "gap:$afterChapterId:$beforeChapterId"
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
    // Which page RN wants the list scrolled to right now — set once when the reader opens (or
    // reopens a different chapterId) to jump straight to the Header of that chapter, matching
    // "continue reading" semantics. Left unset (null pageIndex) while merely scrolling forward
    // to a chapter that was already the visible next block — that natural scroll must never be
    // fought by a programmatic jump, which is why this is a one-shot request, not a continuous
    // binding: RN clears it after the native side reports the scroll happened.
    scrollToChapterId: String? = null,
    scrollToPageIndex: Int? = null,
    modifier: Modifier = Modifier,
    onVisiblePageChanged: (chapterId: String, pageIndex: Int) -> Unit = { _, _ -> },
    onScrollToChapterHandled: () -> Unit = {},
) {
    val listState = rememberLazyListState()
    val context = LocalContext.current
    val preloader = remember { PagePreloader(context) }
    val entries = remember(blocks) { flattenBlocks(blocks) }
    val allPageUrls = remember(blocks) { blocks.flatMap { it.pageUrls } }

    DisposableEffect(Unit) {
        onDispose { preloader.clear() }
    }

    // Deliberately NOT keyed on `entries`: RN re-renders (and hands down a new `blocks`
    // reference) constantly as neighbor chapters finish prefetching, which would otherwise
    // restart this effect and re-fire the scroll every time — fighting the user's own natural
    // scrolling every few seconds. Only a genuinely new scroll request (different chapterId or
    // pageIndex) should trigger a jump; `entries` is read fresh inside the effect body via a
    // rememberUpdatedState-style capture so it still targets the current list.
    val latestEntries by rememberUpdatedState(entries)
    LaunchedEffect(scrollToChapterId, scrollToPageIndex) {
        if (scrollToChapterId == null) return@LaunchedEffect
        val targetIndex = latestEntries.indexOfFirst {
            it is ListEntry.Page && it.chapterId == scrollToChapterId && it.pageIndexInChapter == (scrollToPageIndex ?: 0)
        }
        if (targetIndex >= 0) {
            listState.scrollToItem(targetIndex)
        }
        onScrollToChapterHandled()
    }

    LaunchedEffect(listState, entries) {
        snapshotFlow { listState.firstVisibleItemIndex }
            .collect { firstVisibleItemIndex ->
                // The visible item can be a Header/Footer/Gap (e.g. right after opening the
                // reader, before any scroll) — fall through to the nearest Page at or after that
                // index so a chapter/page is always reported, matching "first page of this block
                // is what's effectively visible".
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
                    is ListEntry.Gap -> ChapterGapItem()
                }
            }
        }
    }
}

/** Spacer between consecutive chapter blocks — gives scroll a bit of dead zone before the next
 * chapter's Page items can become the most-visible item, avoiding accidental chapter switches
 * right as the Footer/Header boundary scrolls past. Mirrors the reference project's Gap. */
@Composable
internal fun ChapterGapItem() {
    Box(modifier = Modifier.fillMaxWidth().height(48.dp).background(Color.Black))
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
    // Bumped by the retry button below. Included as a request parameter so Coil treats each
    // retry as a distinct cache key — otherwise a request that failed (e.g. a transient WebP
    // decode glitch) would just resolve the same failed entry from its error cache instead of
    // actually re-fetching/re-decoding the bytes.
    var retryCount by remember(url) { mutableIntStateOf(0) }

    SubcomposeAsyncImage(
        model = ImageRequest.Builder(LocalContext.current)
            .data(url)
            .setParameter("retryCount", retryCount)
            // Explicit, stable key (defaults to null otherwise) so SafeBitmapDecoder can
            // serialize this request against PagePreloader's request for the same URL — see
            // PageDecodeCoordinator for why that matters.
            .diskCacheKey(url)
            .apply {
                if (retryCount > 0) {
                    memoryCachePolicy(CachePolicy.WRITE_ONLY)
                    diskCachePolicy(CachePolicy.WRITE_ONLY)
                }
            }
            .build(),
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
                ReaderPagePlaceholder {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Falha ao carregar página", color = Color.White)
                        RetryButton(onClick = { retryCount++ })
                    }
                }
            is AsyncImagePainter.State.Success -> SubcomposeAsyncImageContent()
        }
    }
}

@Composable
internal fun RetryButton(onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .padding(top = 16.dp)
            .background(Color.White, RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 10.dp),
    ) {
        Text("Tentar novamente", color = Color.Black, fontWeight = FontWeight.SemiBold)
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
