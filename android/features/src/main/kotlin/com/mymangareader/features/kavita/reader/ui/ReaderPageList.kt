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
 * Renders the current chapter's pages as a continuous vertical scroll, mirroring the reference
 * project's WebtoonColumn (my-manga-app-reader). SubcomposeAsyncImage + Modifier.fillMaxWidth()
 * (no fixed height) lets Compose's own draw pipeline handle tall webtoon pages without the
 * GL_MAX_TEXTURE_SIZE ceiling that a single classic-View ImageView hits — no manual bitmap
 * slicing needed.
 */
@Composable
fun ReaderPageList(
    pageUrls: List<String>,
    chapterTitle: String,
    nextChapterTitle: String?,
    endOfChapterLabel: String,
    nextChapterLabel: String,
    modifier: Modifier = Modifier,
    onVisiblePageChanged: (Int) -> Unit = {},
) {
    val listState = rememberLazyListState()
    val context = LocalContext.current
    val preloader = remember { PagePreloader(context) }

    DisposableEffect(Unit) {
        onDispose { preloader.clear() }
    }

    LaunchedEffect(listState, pageUrls) {
        snapshotFlow { listState.firstVisibleItemIndex }
            .collect { firstVisibleItemIndex ->
                // Item 0 is the chapter header, so page N sits at list index N + 1 — subtract
                // that offset and clamp to the page range before reporting/preloading.
                val pageIndex = (firstVisibleItemIndex - 1).coerceIn(0, (pageUrls.size - 1).coerceAtLeast(0))
                onVisiblePageChanged(pageIndex)
                preloader.updateWindow(computePreloadWindow(pageUrls, pageIndex))
            }
    }

    LazyColumn(state = listState, modifier = modifier.fillMaxSize()) {
        item(key = "header") { ChapterHeaderItem(chapterTitle = chapterTitle) }
        items(count = pageUrls.size, key = { pageUrls[it] }) { index ->
            ReaderPageImage(url = pageUrls[index])
        }
        item(key = "footer") {
            ChapterFooterItem(
                endOfChapterLabel = endOfChapterLabel,
                nextChapterLabel = nextChapterLabel,
                nextChapterTitle = nextChapterTitle,
            )
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
