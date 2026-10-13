package com.mymangareader.contentdigest.serial

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import com.mymangareader.contentdigest.error.ErrorDigest
import com.mymangareader.contentdigest.error.toErrorDigest
import com.mymangareader.externalmetadataserver.ExternalMetadataActiveInfo
import com.mymangareader.externalmetadataserver.ExternalMetadataPendingException
import com.mymangareader.externalmetadataserver.ExternalMetadataServer
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataMatch
import com.mymangareader.externalmetadataserver.plugins.ExternalMetadataSeriesRef
import kotlinx.serialization.Serializable

// Same 2-state shape ChapterDigest/PageDigest already use for a tolerated-failure field.
// "Never asked for this at all" is deliberately NOT a 3rd state here — that decision belongs to
// whoever decides whether to call buildExternalMetadataDigest in the first place (e.g.
// SerialDigestOptions.includeExternalMetadata), not to this type. Once called, there are only two
// real outcomes: it worked (Success — match itself may still be null, meaning the provider has no
// entry for this series) or it didn't (Failure — including "no ExternalMetadataServer group is
// configured at all," which surfaces as a Failure with a stable error code, not a bare null).
@Serializable
sealed interface ExternalMetadataDigest {
    @Serializable
    data class Success(
        val match: ExternalMetadataMatch?,
        val server: ExternalMetadataActiveInfo,
        val resolvedAtEpochMs: Long,
    ) : ExternalMetadataDigest

    @Serializable
    data class Failure(
        val error: ErrorDigest,
    ) : ExternalMetadataDigest
}

private const val NOT_CONFIGURED_ERROR_CODE = "not_configured"

// The enrichment fetch was still running when the digest had to answer. Not an error: the work
// continues in the background and the next read is served from cache. Kept apart from a real
// failure so the UI can say "still coming" rather than "something went wrong".
// Internal, not private: buildSerialDigest also reads it, to refuse serving a cached digest whose
// enrichment was still in flight when it was written (see its own note).
internal const val PENDING_ERROR_CODE = "pending"

// The enrichment leg runs in parallel with the Kavita legs of a series build, and the build waits
// for the slowest. The server itself already caps the FETCH (1s first open, 8s forced), but picking
// the enrichment URL — a health check per candidate, each up to its own timeout, plus a retry —
// happens BEFORE that window opens. With the enrichment server down, opening a series sat through
// those checks even though the series, chapters and read progress (what the app is actually for)
// were ready. Whatever the enrichment leg is still doing at this deadline is reported as "pending"
// and left to finish in the background; it never holds the screen. Forced reads get longer, but
// still bounded, matching the server's own forced window plus its URL resolution.
private val externalLegScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
private const val EXTERNAL_LEG_BUDGET_MS = 2_000L
private const val EXTERNAL_LEG_FORCED_BUDGET_MS = 10_000L

// Standalone builder, same shape as buildChapterDigest/buildPageDigest — has its own callers
// beyond SerialDigest (the RN bridge can call this directly, without building a whole
// SerialDigest, when it only needs the external-metadata part). [externalMetadataServer] is
// always the real instance — "should I even try this" is the caller's decision (they simply
// don't call this function at all if not); this function's own first move is asking that
// instance whether any group is configured, so "not configured" is a real Failure outcome
// discovered here, never a null passed in from outside.
suspend fun buildExternalMetadataDigest(
    externalMetadataServer: ExternalMetadataServer,
    groupId: String?,
    kavitaServerGroupId: String,
    series: ExternalMetadataSeriesRef,
    // Carries the caller's own "the user asked for fresh data" intent down to the enrichment
    // read, so a pull-to-refresh refreshes this too instead of being served whatever was stored.
    force: Boolean = false,
): ExternalMetadataDigest {
    return try {
        if (externalMetadataServer.groups.list().isEmpty()) {
            return ExternalMetadataDigest.Failure(
                ErrorDigest(code = NOT_CONFIGURED_ERROR_CODE, message = "No external metadata group is configured"),
            )
        }

        val budgetMs = if (force) EXTERNAL_LEG_FORCED_BUDGET_MS else EXTERNAL_LEG_BUDGET_MS
        // Run in its own scope and only AWAIT it with a deadline: the URL health check is a blocking
        // OkHttp call, which a plain withTimeout around it cannot interrupt — it would only return
        // once that call's own timeout expired, i.e. the deadline would never hold. Awaiting is
        // cancellable, and the abandoned work simply finishes (or fails) in the background.
        val inFlight =
            externalLegScope.async {
                if (groupId != null) {
                    externalMetadataServer.match.syncByGroup(groupId, series, force)
                } else {
                    externalMetadataServer.match.syncByServerId(kavitaServerGroupId, series, force)
                }
            }
        val response =
            // Default dispatcher on purpose: the deadline is wall-clock time, never a scheduler's
            // virtual clock that may be fast-forwarded while the real work is still running.
            withContext(Dispatchers.Default) { withTimeoutOrNull(budgetMs) { inFlight.await() } }
                ?: return ExternalMetadataDigest.Failure(
                ErrorDigest(code = PENDING_ERROR_CODE, message = "External metadata server did not answer within ${budgetMs}ms"),
            )
        ExternalMetadataDigest.Success(
            match = response.data,
            server = response.serverInfo,
            resolvedAtEpochMs = response.resolvedAtEpochMs,
        )
    } catch (e: ExternalMetadataPendingException) {
        ExternalMetadataDigest.Failure(ErrorDigest(code = PENDING_ERROR_CODE, message = e.message))
    } catch (e: Exception) {
        ExternalMetadataDigest.Failure(e.toErrorDigest())
    }
}
