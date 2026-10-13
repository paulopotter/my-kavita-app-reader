package com.mymangareader.features.kavita.reader.ui

import coil.request.ImageRequest
import com.mymangareader.tools.network.stableImageCacheKey

// Disk AND memory cache key of a page image: its path and query only (see stableImageCacheKey).
// Both keys are set to the same value on purpose — set only the disk one and a host switch would
// still miss the memory cache and re-decode a page that is sitting right there.
internal fun ImageRequest.Builder.stableImageKeys(url: String): ImageRequest.Builder {
    val key = stableImageCacheKey(url)
    return diskCacheKey(key).memoryCacheKey(key)
}
