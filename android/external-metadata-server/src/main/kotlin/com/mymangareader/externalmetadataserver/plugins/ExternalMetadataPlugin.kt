package com.mymangareader.externalmetadataserver.plugins

import com.mymangareader.cache.Cache
import com.mymangareader.tools.network.RequestTool
import kotlinx.serialization.Serializable

// Provider-agnostic shapes ExternalMetadataPlugin speaks in — not the app-wide contract, just
// enough structure for ExternalMetadataServer to work with any metadata provider without knowing
// its provider-specific DTOs. Each adapter (e.g. PersonalBffPlugin) translates its raw plugin's
// real response into these. Unlike ServerPlugin, there's no serial/chapter/page content tree —
// today's real behavior is "given a batch of series references, return metadata matches."

// The minimum ExternalMetadataServer needs to correlate a match back to a series — deliberately
// not SeriesSummary (that type lives in the old :features/kavita module) nor PluginSerial (that
// would create a Gradle dependency on the sibling :server module, breaking module isolation).
// Callers (RN, via a future ExternalMetadataService) build this list from whatever series data
// they already have on hand.
data class ExternalMetadataSeriesRef(
    val id: String,
    // Which content provider [id] belongs to — the `providerId` of the server group the series
    // was read from (a ServerPluginRegistration.id like "kavita", declared in code, never typed
    // by the user). Without it [id] is an id with no stated owner: today every id happens to come
    // from the same provider, so matching works by unspoken agreement. A provider-qualified
    // lookup is what lets a metadata provider answer "this exact series", and it's what keeps a
    // second content provider from silently matching another provider's series of the same name.
    val providerId: String,
    val name: String,
)

@Serializable
data class ExternalMetadataAlternativeTitle(
    val label: String,
    val value: String,
)

// Whatever ids the metadata provider knows this series by, on OTHER services. Deliberately a
// nested type rather than flattened into [ExternalMetadataMatch]: this set grows as a provider
// learns new services, and flattening would grow the match's own surface every time. Every field
// is nullable — a provider knowing one id says nothing about it knowing the others.
@Serializable
data class ExternalMetadataExternalIds(
    val malId: Int? = null,
    val anilistId: Int? = null,
    val nexusId: Int? = null,
    val onyxreaderId: Int? = null,
)

// [slug] is the metadata provider's own handle for this series. It is a RESULT of a lookup, never
// an identity to store: it is derived from the title, so it changes when a series is retitled,
// and nothing that persisted it would still match. The stable key is [seriesId] + the ref's
// providerId.
//
// Field population depends on which call produced this match. The single-series lookup fills
// everything the provider knows; the batch listing fills only what a listing carries (status,
// chapter counts, hasErrors). So a null descriptive field means "not answered by THIS call",
// never "the provider doesn't have it" — don't conclude absence from a batch result.
@Serializable
data class ExternalMetadataMatch(
    val seriesId: String,
    val slug: String?,
    val status: String,
    val downloadedChapters: Int?,
    val totalChapters: Int?,
    val latestChapterLabel: String?,
    val hasErrors: Boolean,
    // Series the provider has stopped tracking upstream — not an error, a stated editorial fact.
    val abandoned: Boolean = false,
    val summary: String? = null,
    val author: String? = null,
    val genres: List<String> = emptyList(),
    val alternativeTitles: List<ExternalMetadataAlternativeTitle> = emptyList(),
    val externalIds: ExternalMetadataExternalIds? = null,
)

/**
 * Describes one credential field an [ExternalMetadataPluginRegistration] needs from the user —
 * same shape/purpose as `CredentialField` in `:server`. [personalBff] declares an empty list
 * today (no auth), but the field exists so a future metadata provider that does need credentials
 * doesn't require reshaping this contract.
 */
data class CredentialField(
    val name: String,
    val label: String,
    val type: String,
    val validate: (value: String) -> String?,
)

/**
 * Everything ExternalMetadataServer needs to know about one [ExternalMetadataPlugin]
 * implementation, without constructing an instance — same shape/purpose as
 * `ServerPluginRegistration` in `:server`.
 */
interface ExternalMetadataPluginRegistration {
    val id: String
    val displayName: String
    val version: String
    val credentialFields: List<CredentialField>

    // The liveness path this provider answers on — the RN config screen passes it straight into
    // groups.add so it never has to know a provider's endpoint. Same role as
    // ServerPluginRegistration.defaultHealthCheckPath.
    val defaultHealthCheckPath: String
    val factory: (requestTool: RequestTool, cache: Cache, baseUrl: String, authJson: String) -> ExternalMetadataPlugin
}

/**
 * Contract every metadata-provider plugin must satisfy — the shape [ExternalMetadataServer] (not
 * yet built) knows how to call, regardless of which real provider answers behind it. A plugin's
 * raw implementation never implements this directly — a dedicated adapter per provider (e.g.
 * `PersonalBffPlugin`) translates the raw calls into this shape.
 *
 * Every operation throws on failure instead of returning [Result] — same standing convention as
 * `:server`.
 */
interface ExternalMetadataPlugin {
    val id: String
    val displayName: String
    val version: String

    val auth: Auth

    // Batch — one listing request, matched locally. fetchMatch (singular) is not implemented as
    // "call this with a list of 1 and filter": each provider decides its own shape for the
    // single-series case, and a provider with a real per-series lookup uses it there (which is
    // why the batch carries fewer fields — see ExternalMetadataMatch's own note).
    //
    // Positional result: result[i] corresponds to series[i], null meaning "no match found for
    // this one" — never a shorter list. Callers must never lose the series↔match correlation by
    // filtering nulls out before matching back up by index/id.
    suspend fun fetchMatches(series: List<ExternalMetadataSeriesRef>): List<ExternalMetadataMatch?>

    suspend fun fetchMatch(series: ExternalMetadataSeriesRef): ExternalMetadataMatch?

    companion object {
        // Same convention as ServerPlugin.DEFAULT_READ_PROTECTION_WINDOW_MS — a plugin
        // implementation MAY memoize a read for up to this long when it would otherwise re-fetch
        // a whole listing for a single series (the case when a per-series lookup finds nothing
        // and the listing is the fallback). Never a real cache (no persistence, no cross-instance
        // sharing), just a guard against redundant full-listing requests fired back-to-back.
        const val DEFAULT_READ_PROTECTION_WINDOW_MS = 3_000L
    }

    // Same shape as ServerPlugin.Auth — kept identical even though M3 (today's only provider)
    // has no real session concept, so a future provider that does need one doesn't require
    // reshaping this contract. checkToken()/reauthenticate() are real no-ops for M3, not stubs.
    interface Auth {
        suspend fun authenticate()

        suspend fun checkToken(): String?

        suspend fun reauthenticate()

        suspend fun logout()

        fun getSession(): String?
    }
}
