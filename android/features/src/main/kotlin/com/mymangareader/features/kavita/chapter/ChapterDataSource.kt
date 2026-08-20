package com.mymangareader.features.kavita.chapter

/**
 * Provider-agnostic contract for chapter/page data — the reader depends on this, never on
 * [KavitaChapterFeature] directly. Swapping Kavita for another source later means adding a new
 * implementation of this interface and rebinding it in FeaturesModule; nothing in the bridge or
 * RN layer changes.
 */
interface ChapterDataSource {
    suspend fun getPageUrls(chapterId: String, expectedPageCount: Int): Result<List<String>>
    suspend fun invalidatePageCache(chapterId: String): Result<Unit>
    suspend fun getPageCacheUrls(chapterId: String): Result<List<Pair<Int, String>>>
    suspend fun getPageDimensions(chapterId: String): Result<List<PageDimension>>
    suspend fun getServerReadProgress(chapterId: String): Result<Int?>
    suspend fun getLocalProgress(chapterId: String): Result<LocalProgress?>
    suspend fun saveLocalProgress(chapterId: String, seriesId: String, page: Int, scrollFraction: Float): Result<Unit>
    suspend fun saveReadingProgress(chapterId: String, seriesId: String, page: Int): Result<Unit>
}
