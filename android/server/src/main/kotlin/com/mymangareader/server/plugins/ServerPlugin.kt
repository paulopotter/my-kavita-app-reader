package com.mymangareader.server.plugins

import com.mymangareader.tools.network.RequestTool
import kotlinx.serialization.Serializable

// Provider-agnostic shapes ServerPlugin speaks in — not the final app-wide contract (that's a
// separate, later layer), just enough structure for Server (not yet built) to work with any
// provider without knowing its provider-specific DTOs. Each adapter (e.g. KavitaServerPlugin) is
// responsible for translating its raw plugin's real response into these.

// Fields from Kavita's real SeriesDto (the first, cheaper series call) — never mixes in fields
// that require the separate SeriesMetadataDto call (see PluginSeriesMetadata below). Naming
// already matches SeriesContract's vocabulary (Task 020), not SeriesDto's raw field names — same
// convention PluginChapter already follows for Chapter (Task 019).
data class PluginSerial(
    val id: String,
    val name: String,
    val pagesRead: Int,
    val totalPages: Int,
    val libraryId: String?,
    val libraryName: String?,
    val lastFolderScannedUtc: String?,
    val lastChapterAddedUtc: String?,
    val latestReadDateUtc: String?,
    val originalName: String?,
    val localizedName: String?,
    val sortName: String?,
    val aniListId: Int?,
    val malId: Long?,
    val primaryColor: String?,
    val secondaryColor: String?,
)

// Fields from Kavita's real SeriesMetadataDto — a genuinely separate network call
// (GET /api/Series/metadata), same precedent as Page's dimensions requiring their own call.
// genres/tags kept as id+name pairs (not just name) — SeriesContract's own correction of an
// earlier finding that discarded GenreDto/TagDto's id.
data class PluginSeriesMetadata(
    val description: String?,
    val genres: List<PluginGenreOrTag>,
    val tags: List<PluginGenreOrTag>,
    val publicationStatus: String?,
    val ageRating: PluginAgeRating?,
    val releaseYear: Int?,
    val language: String?,
)

// [system] is decided by the adapter, not hardcoded here — a rating vocabulary is itself a
// provider concern (e.g. Kavita's own AgeRating enum isn't real ESRB naming, even though it
// shares the same spirit). Grouped with [rating] instead of a bare string so a future second
// rating system doesn't require breaking this field.
@Serializable
data class PluginAgeRating(
    val rating: String?,
    val system: String,
)

@Serializable
data class PluginGenreOrTag(
    val id: String,
    val name: String,
)

data class PluginChapter(
    val id: String,
    val title: String,
    val number: String?,
    val pageCount: Int?,
    val pagesRead: Int?,
    val isSpecial: Boolean?,
    val decimalNumber: Double?,
    val specialLabel: String?,
    val createdUtc: String?,
    val lastReadingProgressUtc: String?,
    val fileFormat: String?,
)

data class PluginProgress(
    val pageIndex: Int,
    val updatedAtUtc: String?,
)

data class PluginPageDimension(
    val width: Int,
    val height: Int,
)

/**
 * Describes one credential field a [ServerPluginRegistration] needs from the user — e.g. Kavita's
 * single required `apiKey`. [name] is the key this value is stored under inside a group's
 * `credentialsJson` blob (plain JSON, format decided per-provider — Server never parses it
 * itself, and never persists anything beyond what the user entered — session state like a JWT is
 * never part of `credentialsJson`, see [ServerPluginRegistration.factory]). [label]/[type] let
 * the RN side build a form dynamically from `Server.providers.list()`, without hardcoding any
 * provider's field names. [validate] runs against the raw string the user entered for this field
 * and returns an error message, or null if valid — never persisted anywhere, purely a function
 * called at validation time (same shape as [ServerPluginRegistration.factory]).
 */
data class CredentialField(
    val name: String,
    val label: String,
    val type: String,
    val validate: (value: String) -> String?,
)

/**
 * Everything Server needs to know about one [ServerPlugin] implementation, without constructing
 * an instance: its static identity (readable from `Server.providers.list()` without touching the
 * network — same values a live instance's [ServerPlugin.id]/[displayName]/[version] expose),
 * [credentialFields] (what this provider needs the user to fill in — not every provider
 * necessarily uses an "apiKey", and not every provider necessarily uses session tokens either),
 * plus [factory].
 *
 * [factory]'s `authJson` is assembled by Server at call time, never persisted as-is: it merges
 * the group's stored `credentialsJson` (from the database) with whatever session state Server is
 * holding in memory for that group (e.g. a JWT once one exists) into a single blob, so a provider
 * with no session concept at all simply never sees/uses a session field — nothing here assumes
 * every provider has a token. Each concrete plugin (e.g. `KavitaServerPlugin`) decides its own
 * `authJson` shape and is the only thing that ever decodes it. Every concrete plugin must expose
 * a `companion object` implementing this — see its `Info` companion for the reference shape.
 * This is a convention, not compiler-enforced (Kotlin interfaces can't require a specific
 * companion object shape).
 */
interface ServerPluginRegistration {
    val id: String
    val displayName: String
    val version: String
    val credentialFields: List<CredentialField>
    val factory: (requestTool: RequestTool, baseUrl: String, authJson: String) -> ServerPlugin
}

/**
 * Contract every content-provider plugin must satisfy — the shape [Server] (not yet built) knows
 * how to call, regardless of which real server answers behind it. A plugin's raw implementation
 * (e.g. `plugins/kavita/`'s own request-only files) never implements this directly — a dedicated
 * adapter per provider (e.g. `KavitaServerPlugin`) translates the raw calls into this shape.
 *
 * Shape: [serials] only holds group-level operations (list, and later find/get-by-index —
 * anything that doesn't require already knowing an id). [serial] hands back one specific
 * instance when the id is already known — same split repeats one level down ([Serial.chapters]
 * vs [Serial.chapter]) and two levels down ([Chapter.pages] vs [Chapter.page]). Each returned
 * instance ([Serial], [Chapter], [Page]) already carries whatever it needs internally (ids,
 * credentials) — callers never repeat an id they already gave once.
 *
 * Every operation throws on failure instead of returning [Result] — this is the standing
 * convention for everything built in this module (`:server`): errors propagate as real
 * exceptions up through the caller chain until whoever actually needs to handle them (the future
 * Server, or above it) decides whether to catch or let them keep rising.
 */
interface ServerPlugin {
    // Identity — mirrors this class's companion ServerPluginRegistration (same values), so both a
    // live instance and the static catalog (Server.providers.list(), no instance needed) agree.
    // Server (and anything logging on its behalf) reads this instead of hardcoding a provider's
    // name in code, per the plan's "provider name is data, not UI copy" decision.
    val id: String            // stable technical id, e.g. "kavita" — same key used to select this plugin
    val displayName: String   // user/log-facing name, e.g. "Kavita"
    val version: String       // this adapter's own version (our Kotlin code, not the remote server's)

    val auth: Auth
    val serials: Serials
    fun serial(serialId: String): Serial

    companion object {
        // Default in-flight/short-lived read protection window: a plugin implementation MAY
        // memoize a read for up to this long when 2+ of its own operations would otherwise issue
        // the exact same request for the exact same data (e.g. Chapters.list() and Chapter.get()
        // both reading the same underlying listing) — never a real cache (no persistence, no
        // cross-instance sharing), just a guard against redundant requests fired back-to-back.
        // Any write that could affect the memoized data must invalidate it immediately, so a
        // read right after a write is never allowed to observe stale data. Each adapter may
        // override this with its own value if 3s doesn't fit its provider.
        const val DEFAULT_READ_PROTECTION_WINDOW_MS = 3_000L
    }

    interface Auth {
        // No parameter — uses whatever credential this instance was already constructed with
        // (decoded from ServerPluginRegistration.factory's authJson). Re-authenticating with a
        // genuinely different credential means building a new plugin instance, not calling this
        // again with a different value. Server always calls this the same way regardless of
        // whether a provider has a real session concept — a provider with none simply does
        // nothing here and leaves getSession() returning null forever, which is a normal,
        // expected outcome, not an error Server needs to special-case.
        suspend fun authenticate()
        suspend fun checkToken(): String?
        suspend fun reauthenticate()
        suspend fun logout()

        // Synchronous, no network call — whatever opaque session blob this instance currently
        // holds (null if it never authenticated yet, or if this provider has no session concept
        // at all — both are valid, unremarkable states). Server never parses this string; it only
        // stores it and later merges it back into a future authJson via
        // ServerPluginRegistration.factory, so only this same plugin class ever reads it again.
        // Any operation needing a session authenticates lazily on its own first if this is null.
        fun getSession(): String?
    }

    interface Serials {
        suspend fun list(): List<PluginSerial>
    }

    interface Serial {
        suspend fun get(): PluginSerial
        suspend fun getMetadata(): PluginSeriesMetadata
        fun getCoverUrl(): String
        val chapters: Chapters
        fun chapter(chapterId: String): Chapter
    }

    interface Chapters {
        suspend fun list(): List<PluginChapter>
        suspend fun setRead(isRead: Boolean, chapterIds: List<String>)
    }

    interface Chapter {
        suspend fun get(): PluginChapter
        fun getCoverUrl(): String
        suspend fun setRead(isRead: Boolean)
        suspend fun getProgress(): PluginProgress?
        suspend fun setProgress(pageIndex: Int)
        val pages: Pages
        fun page(pageIndex: Int): Page
    }

    // Reserved for a future group-level operation (e.g. listing every page at once) without
    // already knowing the index — Kavita has no direct way to do this today, but the symmetry
    // with Serials/Chapters stays ready for when it makes sense.
    interface Pages

    interface Page {
        suspend fun getDimensions(): PluginPageDimension
        fun getUrl(): String
    }
}
