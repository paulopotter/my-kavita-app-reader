package com.mymangareader

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.mymangareader.contentdigest.chapter.buildChapterDigest
import com.mymangareader.contentdigest.page.ChapterSummary
import com.mymangareader.contentdigest.page.buildPageDigest
import com.mymangareader.contentdigest.series.SeriesDigestOptions
import com.mymangareader.contentdigest.series.buildSeriesDigest
import com.mymangareader.externalmetadataserver.ExternalMetadataServer
import com.mymangareader.server.ImageDescriptor
import com.mymangareader.server.Server
import com.mymangareader.server.ServerActiveInfo
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

// RN→Kotlin bridge for :content-digest's builder functions (Layer 3, Tasks 018-020) — a separate
// module from ServerBridgeModule (Layer 2, :server) on purpose, same "a plugin/module lives with
// what understands it" spirit already applied elsewhere in this codebase.
//
// Unlike ServerBridgeModule (which always throws-to-Promise-rejection, since Server itself always
// throws), a PageDigest/ChapterDigest/SeriesDigest never throws for an expected failure — Failure
// is a normal return value, already handled inside the builder function. So every method here
// ALWAYS resolves the Promise with `{isSuccess, ...}` (see DigestBridgeMappers.kt) — Failure
// included. Only a genuinely unexpected exception (a real bug, outside what the builder function
// itself covers) becomes a Promise rejection, via the runCatching wrapping every method already
// has.
//
// PENDING (deliberately out of scope for now, per the user's own call): buildChapterDigest's
// `knownChapter`/`prevChapter`/`nextChapter` and buildSeriesDigest's ability to accept
// already-known chapter data are NOT exposed as parameters here yet — RN has no source of this
// data today (no consumer has been migrated to these digests). Add them as optional parameters
// (ReadableMap → PluginChapter/ChapterNeighborDigest, mirroring DigestBridgeMappers.kt's own
// toWritableMap() functions in reverse) once a real RN caller actually has this data in hand and
// wants to avoid a redundant fetch — do not build this mapping speculatively before that.
@Singleton
class DigestBridgeModule @Inject constructor(
    private val server: Server,
    private val externalMetadataServer: ExternalMetadataServer,
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "DigestBridgeModule"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    @ReactMethod
    fun getPageDigest(seriesId: String, chapterId: String, pageIndex: Int, promise: Promise) {
        scope.launch {
            // buildPageDigest only ever reads chapter.id/chapter.seriesId from the ChapterSummary
            // it receives (see :content-digest's own README — every other field is passed
            // through unfiltered into PageDigest.Success.chapter, never read). Both are already
            // known from this method's own parameters, so no chapter fetch happens here at all —
            // fetching the real chapter (even with full=false) would still cost a real get() +
            // getCoverImage() round trip for data this call never needs.
            val minimalChapterSummary = ChapterSummary(
                id = chapterId,
                seriesId = seriesId,
                decimalNumber = null,
                number = null,
                specialLabel = null,
                isSpecial = null,
                title = "",
                createdUtc = null,
                coverImage = ImageDescriptor(
                    url = "",
                    hasFetchedDimensions = false,
                    width = null,
                    height = null,
                    aspectRatio = null,
                    orientation = null,
                    resolvedAtEpochMs = 0L,
                    server = ServerActiveInfo(
                        groupId = "", groupName = "", providerId = "",
                        urlId = "", url = "", timeoutMs = 0, priority = 0,
                    ),
                    cache = null,
                ),
                resolvedAtEpochMs = 0L,
                server = ServerActiveInfo(
                    groupId = "", groupName = "", providerId = "",
                    urlId = "", url = "", timeoutMs = 0, priority = 0,
                ),
            )
            runCatching { buildPageDigest(server, minimalChapterSummary, pageIndex) }
                .resolveOrReject(promise, "GET_PAGE_DIGEST_ERROR") { it.toWritableMap() }
        }
    }

    @ReactMethod
    fun getChapterDigest(seriesId: String, chapterId: String, full: Boolean, promise: Promise) {
        scope.launch {
            runCatching { buildChapterDigest(server, seriesId, chapterId, full = full) }
                .resolveOrReject(promise, "GET_CHAPTER_DIGEST_ERROR") { it.toWritableMap() }
        }
    }

    // [options] carries full/includeExternalMetadata/externalMetadataGroupId — a ReadableMap
    // instead of separate parameters since this already mirrors SeriesDigestOptions' own
    // "2+ fields → one named object" shape on the Kotlin side. includeExternalMetadata (default
    // false) is what actually turns on the BFF/M3 enrichment — omitting it keeps today's
    // behavior (no extra network call to ExternalMetadataServer) unchanged for existing callers.
    @ReactMethod
    fun getSeriesDigest(seriesId: String, options: ReadableMap, promise: Promise) {
        scope.launch {
            val full = if (options.hasKey("full")) options.getBoolean("full") else false
            val includeExternalMetadata = if (options.hasKey("includeExternalMetadata")) options.getBoolean("includeExternalMetadata") else false
            val externalMetadataGroupId = if (options.hasKey("externalMetadataGroupId")) options.getString("externalMetadataGroupId") else null

            runCatching {
                buildSeriesDigest(
                    server,
                    seriesId,
                    SeriesDigestOptions(
                        full = full,
                        includeExternalMetadata = includeExternalMetadata,
                        externalMetadataServer = if (includeExternalMetadata) externalMetadataServer else null,
                        externalMetadataGroupId = externalMetadataGroupId,
                    ),
                )
            }.resolveOrReject(promise, "GET_SERIES_DIGEST_ERROR") { it.toWritableMap() }
        }
    }
}
