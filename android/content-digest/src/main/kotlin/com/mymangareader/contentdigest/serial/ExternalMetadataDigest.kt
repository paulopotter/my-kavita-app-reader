package com.mymangareader.contentdigest.serial

import com.mymangareader.contentdigest.error.ErrorDigest
import com.mymangareader.contentdigest.error.toErrorDigest
import com.mymangareader.externalmetadataserver.ExternalMetadataActiveInfo
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
    data class Failure(val error: ErrorDigest) : ExternalMetadataDigest
}

private const val NOT_CONFIGURED_ERROR_CODE = "not_configured"

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
): ExternalMetadataDigest {
    return try {
        if (externalMetadataServer.groups.list().isEmpty()) {
            return ExternalMetadataDigest.Failure(
                ErrorDigest(code = NOT_CONFIGURED_ERROR_CODE, message = "No external metadata group is configured"),
            )
        }

        val response = if (groupId != null) {
            externalMetadataServer.match.syncByGroup(groupId, series)
        } else {
            externalMetadataServer.match.syncByServerId(kavitaServerGroupId, series)
        }
        ExternalMetadataDigest.Success(
            match = response.data,
            server = response.serverInfo,
            resolvedAtEpochMs = response.resolvedAtEpochMs,
        )
    } catch (e: Exception) {
        ExternalMetadataDigest.Failure(e.toErrorDigest())
    }
}
