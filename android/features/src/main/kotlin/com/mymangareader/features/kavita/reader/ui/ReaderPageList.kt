package com.mymangareader.features.kavita.reader.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
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
    modifier: Modifier = Modifier,
    onVisiblePageChanged: (Int) -> Unit = {},
) {
    val listState = rememberLazyListState()

    LaunchedEffect(listState) {
        snapshotFlow { listState.firstVisibleItemIndex }
            .collect { onVisiblePageChanged(it) }
    }

    LazyColumn(state = listState, modifier = modifier.fillMaxSize()) {
        items(count = pageUrls.size, key = { pageUrls[it] }) { index ->
            ReaderPageImage(url = pageUrls[index])
        }
    }
}

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
