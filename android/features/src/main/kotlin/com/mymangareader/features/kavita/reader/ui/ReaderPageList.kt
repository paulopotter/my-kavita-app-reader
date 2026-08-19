package com.mymangareader.features.kavita.reader.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
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
    // Height/width aspect ratio per page (aligned by index with pageUrls), from Kavita's
    // chapter-info?includeDimensions=true — lets ReaderPageList size a page's landmark before it's
    // actually decoded on-device, instead of only finding out its height via onGloballyPositioned
    // once it scrolls into view. 0 (or a short list) means "unavailable for this page" — falls
    // back to the onGloballyPositioned measurement, same as before this existed.
    val pageAspectRatios: List<Float>,
    val nextChapterTitle: String?,
    val endOfChapterLabel: String,
    val nextChapterLabel: String,
)

private sealed interface ListEntry {
    data class Header(val block: ChapterBlock) : ListEntry
    data class Page(
        val chapterId: String,
        val pageIndexInChapter: Int,
        val url: String,
        // 0 means unavailable — see ChapterBlock.pageAspectRatios.
        val aspectRatio: Float,
    ) : ListEntry
    data class Footer(val block: ChapterBlock) : ListEntry
    data class Gap(val afterChapterId: String, val beforeChapterId: String) : ListEntry
}

private fun flattenBlocks(blocks: List<ChapterBlock>): List<ListEntry> = buildList {
    blocks.forEachIndexed { index, block ->
        if (index > 0) {
            add(ListEntry.Gap(afterChapterId = blocks[index - 1].chapterId, beforeChapterId = block.chapterId))
        }
        add(ListEntry.Header(block))
        block.pageUrls.forEachIndexed { pageIndex, url ->
            val aspectRatio = block.pageAspectRatios.getOrElse(pageIndex) { 0f }
            add(ListEntry.Page(block.chapterId, pageIndex, url, aspectRatio))
        }
        add(ListEntry.Footer(block))
    }
}

private fun ListEntry.key(): String = when (this) {
    is ListEntry.Header -> "header:${block.chapterId}"
    is ListEntry.Page -> "page:$chapterId:$pageIndexInChapter"
    is ListEntry.Footer -> "footer:${block.chapterId}"
    is ListEntry.Gap -> "gap:$afterChapterId:$beforeChapterId"
}

private data class ScrollSnapshot(
    val firstVisibleItemIndex: Int,
    val firstVisibleItemScrollOffset: Int,
    val viewportEndOffset: Int,
    val measuredItemCount: Int,
)

/**
 * Which page's bottom edge is the furthest one to have reached the bottom of the viewport —
 * i.e. the last page the user has scrolled AT LEAST to the bottom of, not merely the one
 * touching the top. [firstVisibleItemIndex]/[firstVisibleItemScrollOffset] anchor the walk (same
 * landmarks as [computeVisiblePageAndFraction]), but the target line is the viewport's BOTTOM
 * (`absoluteScrollOffset + viewportEndOffset`), not its top. This is what BABY STEP 1 (page-only
 * progress bar) needs: opening a chapter with pages 1+2 both on screen should read as "0 pages
 * read yet", and reaching the very last page's bottom edge should read 100% — neither of which
 * "which page touches the top" can deliver, since the top-anchored index gets stuck one page
 * short whenever the tail of the chapter (short last page + footer) is shorter than the viewport.
 */
private fun computeBottomVisiblePageIndex(
    entries: List<ListEntry>,
    itemHeights: Map<String, Int>,
    firstVisibleItemIndex: Int,
    firstVisibleItemScrollOffset: Int,
    viewportEndOffset: Int,
): ListEntry.Page? {
    var cumulativeTop = 0
    for (index in 0 until firstVisibleItemIndex) {
        val height = itemHeights[entries.getOrNull(index)?.key()] ?: return null
        cumulativeTop += height
    }
    val bottomLine = cumulativeTop + firstVisibleItemScrollOffset + viewportEndOffset

    // Walk forward accumulating heights until the running top edge passes the viewport's bottom
    // line — the last Page entry whose top edge is still above that line is the furthest one the
    // user has scrolled to (its bottom may be fully past the line, or it may be the one currently
    // straddling it; both count as "reached").
    var runningTop = cumulativeTop
    var lastPageSeen: ListEntry.Page? = null
    var index = firstVisibleItemIndex
    while (index < entries.size && runningTop < bottomLine) {
        val entry = entries[index]
        val height = itemHeights[entry.key()] ?: break
        if (entry is ListEntry.Page) {
            lastPageSeen = entry
        } else if (entry is ListEntry.Footer && lastPageSeen?.chapterId == entry.block.chapterId) {
            // Footer of the same chapter reached the bottom line — the chapter's last page counts
            // as fully read even though it's a Footer, not a Page, that crossed the line.
            break
        }
        runningTop += height
        index++
    }
    return lastPageSeen
}

/**
 * BABY STEP 2: continuous progress fraction across the WHOLE chapter, weighted by each page's
 * real height — not "which page" (baby step 1) and not "fraction within one page" alone. Each
 * page's share of the chapter is proportional to its own height vs. the chapter's total height
 * (a short page contributes less to the bar than a tall one), and the "read" line is the
 * viewport's BOTTOM edge (same reasoning as [computeBottomVisiblePageIndex] — the user
 * confirmed this: opening a chapter with the next page peeking in shouldn't already count it,
 * only content that's fully scrolled past the bottom of the screen).
 *
 * Returns null when the chapter's total height isn't fully known yet (an unmeasured page ahead
 * — same "wait for landmarks" contract as the other compute* functions here). Header/Footer are
 * deliberately excluded from the height sum: they exist for infinite-scroll structure, not
 * reading progress, and — unlike Pages — never get a pre-computed height from Kavita's
 * aspectRatio data (only onGloballyPositioned measures them, which for the Footer only happens
 * once the user has already scrolled to the very end of the chapter). Requiring their height
 * would make chapterFraction uncomputable — permanently null — until that first full read-through,
 * which is exactly what caused the bar to sit stuck at 0% (confirmed via reader-log-v16.txt:
 * chapterFraction=0.0 on every single line, chapter never reached its Footer).
 *
 * NOTE for future work: this same bottom-of-viewport pixel math (chapter-relative absolute
 * offset ÷ total chapter height) is a natural building block for restoring scroll to the exact
 * pixel the user left off at, not just the top of the page they were on (currently
 * scrollToItem(pageIndex) with no offset — see the `scrollToPageIndex` LaunchedEffect below).
 * Deliberately not wired up yet — this pass only touches the progress bar, per explicit
 * instruction to change one thing at a time.
 */
private fun computeChapterFraction(
    entries: List<ListEntry>,
    itemHeights: Map<String, Int>,
    chapterId: String,
    firstVisibleItemIndex: Int,
    firstVisibleItemScrollOffset: Int,
    viewportEndOffset: Int,
): Float? {
    val chapterPages = entries.filterIsInstance<ListEntry.Page>().filter { it.chapterId == chapterId }
    if (chapterPages.isEmpty()) return null

    var chapterTotalHeight = 0
    for (page in chapterPages) {
        chapterTotalHeight += itemHeights[page.key()] ?: return null
    }
    if (chapterTotalHeight <= 0) return null

    var cumulativeTop = 0
    for (index in 0 until firstVisibleItemIndex) {
        cumulativeTop += itemHeights[entries.getOrNull(index)?.key()] ?: 0
    }
    val bottomLine = cumulativeTop + firstVisibleItemScrollOffset + viewportEndOffset

    val chapterStartTop = entries.indexOf(chapterPages.first()).let { startIndex ->
        var top = 0
        for (index in 0 until startIndex) {
            top += itemHeights[entries.getOrNull(index)?.key()] ?: 0
        }
        top
    }
    val readWithinChapter = (bottomLine - chapterStartTop).coerceIn(0, chapterTotalHeight)

    return (readWithinChapter.toFloat() / chapterTotalHeight.toFloat()).coerceIn(0f, 1f)
}

/**
 * Landmarks-based scroll fraction: derives which page is visible and how far scrolled into it
 * the viewport is from [firstVisibleItemIndex]/[firstVisibleItemScrollOffset] (updated
 * synchronously by the scroll gesture itself) plus each entry's real measured height in
 * [itemHeights] — never from LazyListState.layoutInfo.visibleItemsInfo, which only refreshes on a
 * Compose measure pass and can fall behind a burst of quick manual swipes. Returns null when an
 * entry ahead hasn't been measured yet (nothing to compute against) or no Page/Footer is found.
 */
private fun computeVisiblePageAndFraction(
    entries: List<ListEntry>,
    itemHeights: Map<String, Int>,
    firstVisibleItemIndex: Int,
    firstVisibleItemScrollOffset: Int,
): Pair<ListEntry.Page, Float>? {
    var cumulativeTop = 0
    for (index in 0 until firstVisibleItemIndex) {
        val height = itemHeights[entries.getOrNull(index)?.key()] ?: return null
        cumulativeTop += height
    }
    val absoluteScrollOffset = cumulativeTop + firstVisibleItemScrollOffset

    // Walk forward from firstVisibleItemIndex to find the Page (or Footer, treated as "last page
    // fully read") that absoluteScrollOffset currently falls within — a Header/Footer/Gap barely
    // clinging to the viewport edge by a pixel is skipped in favor of the Page actually filling
    // the screen.
    var runningTop = cumulativeTop
    var targetIndex = firstVisibleItemIndex
    var targetEntry: ListEntry? = null
    while (targetIndex < entries.size) {
        val entry = entries[targetIndex]
        val height = itemHeights[entry.key()] ?: break
        if (entry is ListEntry.Page || entry is ListEntry.Footer) {
            targetEntry = entry
            break
        }
        runningTop += height
        targetIndex++
    }

    return when (val entry = targetEntry) {
        is ListEntry.Footer -> {
            val lastPage = entries.take(targetIndex)
                .lastOrNull { it is ListEntry.Page && it.chapterId == entry.block.chapterId }
                as? ListEntry.Page
                ?: return null
            lastPage to 1f
        }
        is ListEntry.Page -> {
            val height = itemHeights[entry.key()]
            if (height == null || height <= 0) return entry to 0f

            // firstVisibleItemIndex/layout-based signals (canScrollForward, "is the Footer
            // visible") are NOT reliable for detecting "user scrolled past this page" on their
            // own: for a short last page (e.g. 884px, well under a ~2500px viewport) the Footer
            // can already peek into view — or firstVisibleItemIndex can get stuck one entry short
            // of ever reaching it — while the user has barely started reading that page. Both
            // reproduced identically in on-device logs (fraction=1.0 while
            // firstVisibleItemScrollOffset was still climbing steadily within the same page).
            // canScrollForward also breaks once the prev/next chapter trio is re-enabled for
            // infinite scroll: it only reflects the end of the WHOLE loaded list (curr+next), not
            // this specific chapter's Footer, so it'd stay true long after curr's page is
            // actually fully read. The only thing that generalizes to both cases is comparing
            // absoluteScrollOffset directly against this PAGE's own known start position
            // (runningTop) and height — both already known from itemHeights (server-provided
            // dimensions or a real measurement) regardless of what's currently laid out on screen.
            val fraction = ((absoluteScrollOffset - runningTop).toFloat() / height.toFloat()).coerceIn(0f, 1f)
            entry to fraction
        }
        else -> null
    }
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
    // pageFraction: how much of the CURRENT page (top-anchored, computeVisiblePageAndFraction —
    // the pre-existing landmarks logic) has scrolled past — the "X%" the user asked to see next
    // to the page itself. chapterFraction: the whole-chapter continuous fraction (see
    // computeChapterFraction) driving the progress bar — the "Y%" for the chapter as a whole.
    onVisiblePageChanged: (chapterId: String, pageIndex: Int, pageFraction: Float, chapterFraction: Float) -> Unit = { _, _, _, _ -> },
    onScrollToChapterHandled: () -> Unit = {},
    // Tap detected directly on the LazyColumn via pointerInput/detectTapGestures — mirrors the
    // reference project's WebtoonColumn onTap. Doing this here (not via an RN Pressable overlay)
    // is what lets Compose's own gesture recognizer stay in the same touch-arbitration tree as
    // the LazyColumn's scroll gesture, so a tap never races with (and sometimes blocks) scroll —
    // an RN-side PanResponder placed over this native view raced the Compose gesture detector for
    // the touch stream and intermittently ate scroll gestures, confirmed on-device.
    onTap: () -> Unit = {},
) {
    val listState = rememberLazyListState()
    val context = LocalContext.current
    val preloader = remember { PagePreloader(context) }
    val entries = remember(blocks) { flattenBlocks(blocks) }
    val allPageUrls = remember(blocks) { blocks.flatMap { it.pageUrls } }

    // Real on-screen height (px) of each item — either reported by Modifier.onGloballyPositioned
    // as it's measured, or precomputed below from ChapterBlock.pageAspectRatios (server-provided
    // dimensions) before the page has ever been decoded on-device. See the "landmarks" approach
    // below for why this replaces reading LazyListState.layoutInfo.visibleItemsInfo every frame.
    // Keyed by ListEntry.key() (stable across `entries` reference changes from RN re-renders)
    // rather than list index.
    val itemHeights = remember { mutableStateMapOf<String, Int>() }
    var containerWidthPx by remember { mutableIntStateOf(0) }

    // Precomputes Page landmarks from server-provided aspect ratios as soon as both the entry
    // list and the container's real width are known — this is what lets scrollFraction be
    // accurate for a page the user hasn't scrolled to yet at all, not just pages that already
    // passed through onGloballyPositioned. Only fills in entries not already measured for real
    // (onGloballyPositioned's actual decoded size always wins over this estimate — see the put
    // guard below) and only overwrites its own prior estimate, never a real measurement.
    LaunchedEffect(entries, containerWidthPx) {
        if (containerWidthPx <= 0) return@LaunchedEffect
        entries.forEach { entry ->
            if (entry !is ListEntry.Page || entry.aspectRatio <= 0f) return@forEach
            val key = entry.key()
            if (key in itemHeights) return@forEach
            itemHeights[key] = (containerWidthPx * entry.aspectRatio).toInt()
        }
    }

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
    val latestAllPageUrls by rememberUpdatedState(allPageUrls)
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

    // Landmarks approach: instead of asking "what fraction of the currently-visible item's
    // height has scrolled past" every frame (which needs LazyListState.layoutInfo —
    // visibleItemsInfo's offset/size — recomputed on every measure pass), precompute each item's
    // cumulative top-edge position (sum of every prior item's real measured height) once its
    // height is known via itemHeights, then derive scrollFraction from
    // firstVisibleItemScrollOffset (a plain Int, no measure-pass dependency) against that
    // landmark. This was the actual fix for the progress bar "not tracking scroll": reading
    // layoutInfo/visibleItemsInfo was correct in principle, but a burst of quick manual swipes
    // (confirmed via ViewPostIme pointer down/up events in logcat, ~250-700ms apart) meant the
    // Compose measure pass — needed to refresh layoutInfo — didn't keep up frame-by-frame with
    // each swipe, so most of the swipes' scroll distance was invisible to the observer and only
    // showed up as one big jump once measurement caught up. firstVisibleItemScrollOffset is
    // updated synchronously by the scroll gesture itself (LazyListState's own scroll consumption),
    // not by a subsequent measure pass, so it can't fall behind swipes the same way.
    LaunchedEffect(listState) {
        // Debug-only: cumulative absolute scroll position from the previous emission, so each log
        // line can show the raw pixel delta the finger/fling actually moved between emissions —
        // makes it possible to compare "pixels moved" directly against "fraction reported" instead
        // of inferring it from timestamps.
        var lastAbsoluteScrollOffset: Int? = null

        // Last chapterFraction that computeChapterFraction was actually able to compute (not the
        // page-only scrollFraction fallback). computeChapterFraction returns null whenever an
        // entry ahead of the viewport (commonly the chapter's own Footer, or a Page whose
        // server-provided aspect ratio was unavailable and hasn't been measured on-device yet)
        // hasn't reported a real height into itemHeights — which happens routinely right as the
        // user crosses into a fresh page, since that's exactly when a new "ahead" entry comes
        // into play. Falling back to scrollFraction (a single PAGE's own 0..1 fraction) on those
        // null ticks made the bar visibly reset to ~0% every time a page boundary was crossed —
        // reported by the user as "preenche e apaga a cada imagem". Holding the last good
        // chapter-wide fraction instead means the bar just pauses growing for a tick or two
        // rather than snapping backwards.
        var lastChapterFraction = 0f

        // Reading itemHeights.size inside the snapshotFlow block (not just inside collect) makes
        // this flow re-emit whenever a new item finishes measuring too — not only on scroll.
        // Needed because onGloballyPositioned for the initially-visible items and this flow's
        // first emission race each other with no guaranteed order; without this, a first emission
        // that lands before the visible item is measured would return null from
        // computeVisiblePageAndFraction and, with no further scroll to trigger a re-emission
        // (e.g. right after opening the reader, or in a Robolectric test with no real gesture),
        // never recover.
        snapshotFlow {
            // itemHeights.size is included purely to make this flow re-emit when a new item
            // finishes measuring (see comment above) — its value is otherwise unused.
            ScrollSnapshot(
                firstVisibleItemIndex = listState.firstVisibleItemIndex,
                firstVisibleItemScrollOffset = listState.firstVisibleItemScrollOffset,
                viewportEndOffset = listState.layoutInfo.viewportEndOffset,
                measuredItemCount = itemHeights.size,
            )
        }
            .collect { snapshot ->
                val result = computeVisiblePageAndFraction(
                    entries = latestEntries,
                    itemHeights = itemHeights,
                    firstVisibleItemIndex = snapshot.firstVisibleItemIndex,
                    firstVisibleItemScrollOffset = snapshot.firstVisibleItemScrollOffset,
                ) ?: return@collect
                val (visibleEntry, scrollFraction) = result
                val firstVisibleItemIndex = snapshot.firstVisibleItemIndex
                val firstVisibleItemScrollOffset = snapshot.firstVisibleItemScrollOffset

                var cumulativeTop = 0
                for (index in 0 until firstVisibleItemIndex) {
                    cumulativeTop += itemHeights[latestEntries.getOrNull(index)?.key()] ?: 0
                }
                val absoluteScrollOffset = cumulativeTop + firstVisibleItemScrollOffset
                val deltaPx = lastAbsoluteScrollOffset?.let { absoluteScrollOffset - it }
                lastAbsoluteScrollOffset = absoluteScrollOffset

                // BABY STEP 1: RN's progress bar only cares about "which page index to report",
                // computed from the viewport's BOTTOM edge — not top-anchored visibleEntry above,
                // which stays reserved for scrollFraction/CoilDiagnostic logging (untouched Kotlin
                // landmarks logic, kept alive but unused by the bar per explicit instruction).
                val bottomPage = computeBottomVisiblePageIndex(
                    entries = latestEntries,
                    itemHeights = itemHeights,
                    firstVisibleItemIndex = firstVisibleItemIndex,
                    firstVisibleItemScrollOffset = firstVisibleItemScrollOffset,
                    viewportEndOffset = snapshot.viewportEndOffset,
                ) ?: visibleEntry

                // BABY STEP 2: continuous chapter-wide fraction (page-height-weighted), replacing
                // baby step 1's coarse (pageIndex+1)/totalPages — see computeChapterFraction doc.
                // Falls back to the page-only estimate while an entry ahead isn't measured yet
                // (same "wait for landmarks" contract every compute* function here follows).
                val chapterFraction = computeChapterFraction(
                    entries = latestEntries,
                    itemHeights = itemHeights,
                    chapterId = bottomPage.chapterId,
                    firstVisibleItemIndex = firstVisibleItemIndex,
                    firstVisibleItemScrollOffset = firstVisibleItemScrollOffset,
                    viewportEndOffset = snapshot.viewportEndOffset,
                )?.also { lastChapterFraction = it } ?: lastChapterFraction

                android.util.Log.d(
                    "CoilDiagnostic",
                    "scrollFraction chapterId=${visibleEntry.chapterId} page=${visibleEntry.pageIndexInChapter} " +
                        "bottomPage=${bottomPage.pageIndexInChapter} chapterFraction=$chapterFraction " +
                        "screenPercent=${Math.round(scrollFraction * 100)}% " +
                        "firstVisibleIndex=$firstVisibleItemIndex firstVisibleOffset=$firstVisibleItemScrollOffset " +
                        "viewportEndOffset=${snapshot.viewportEndOffset} " +
                        "itemHeight=${itemHeights[visibleEntry.key()]} " +
                        "absoluteScrollOffset=$absoluteScrollOffset deltaPx=$deltaPx fraction=$scrollFraction",
                )

                onVisiblePageChanged(bottomPage.chapterId, bottomPage.pageIndexInChapter, scrollFraction, chapterFraction)

                val absoluteIndex = latestAllPageUrls.indexOf(visibleEntry.url)
                if (absoluteIndex >= 0) {
                    preloader.updateWindow(computePreloadWindow(allPageUrls, absoluteIndex))
                }
            }
    }

    LazyColumn(
        state = listState,
        modifier = modifier.fillMaxSize()
            .onGloballyPositioned { coordinates ->
                containerWidthPx = coordinates.size.width
            }
            .pointerInput(Unit) {
                detectTapGestures(onTap = { onTap() })
            },
    ) {
        entries.forEach { entry ->
            item(key = entry.key()) {
                val entryKey = entry.key()
                Box(
                    modifier = Modifier.onGloballyPositioned { coordinates ->
                        val newHeight = coordinates.size.height
                        val oldHeight = itemHeights[entryKey]
                        if (oldHeight != null && oldHeight != newHeight) {
                            android.util.Log.w(
                                "CoilDiagnostic",
                                "itemHeights CHANGED key=$entryKey oldHeight=$oldHeight newHeight=$newHeight",
                            )
                        }
                        itemHeights[entryKey] = newHeight
                    },
                ) {
                    when (entry) {
                        is ListEntry.Header -> ChapterHeaderItem(chapterTitle = entry.block.chapterTitle)
                        is ListEntry.Page -> ReaderPageImage(url = entry.url, aspectRatio = entry.aspectRatio)
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
internal fun ReaderPageImage(url: String, aspectRatio: Float = 0f) {
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
                ReaderPagePlaceholder(aspectRatio) { CircularProgressIndicator(color = Color.White) }
            is AsyncImagePainter.State.Error ->
                ReaderPagePlaceholder(aspectRatio) {
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

// aspectRatio (height/width) mirrors ListEntry.Page.aspectRatio: uses the real server-provided
// ratio when known, so the placeholder's own height matches what itemHeights already estimated
// via LaunchedEffect(entries, containerWidthPx) above — otherwise the placeholder's height
// (previously a hardcoded 2:3) would win the item(key=...) measurement while loading and
// overwrite that estimate with a wrong value, then get overwritten again once the real image
// decodes. That oscillation (visible in on-device logs as itemHeights swinging between two very
// different heights for the same page) was throwing off computeChapterFraction's chapter-total
// height, making the progress bar hit 100% before the last page had actually finished scrolling
// past — since Coil's default placeholder aspect ratio (2:3) has no relation to the actual page.
@Composable
private fun ReaderPagePlaceholder(aspectRatio: Float = 0f, content: @Composable () -> Unit) {
    Box(
        modifier = Modifier.fillMaxWidth().aspectRatio(if (aspectRatio > 0f) 1f / aspectRatio else 2f / 3f),
        contentAlignment = Alignment.Center,
    ) {
        content()
    }
}
