package com.mymangareader.server.plugins

// Provider-agnostic shapes ServerPlugin speaks in — not the final app-wide contract (that's a
// separate, later layer), just enough structure for Server (not yet built) to work with any
// provider without knowing its provider-specific DTOs. Each adapter (e.g. KavitaServerPlugin) is
// responsible for translating its raw plugin's real response into these.

data class PluginSerial(
    val id: String,
    val name: String,
    val coverUrl: String?,
    val pagesRead: Int,
    val totalPages: Int,
    val lastUpdatedUtc: String?,
    val summary: String?,
    val genres: List<String>,
    val tags: List<String>,
)

data class PluginChapter(
    val id: String,
    val title: String,
    val number: String?,
    val pageCount: Int,
    val pagesRead: Int,
    val isSpecial: Boolean,
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
        suspend fun authenticate(apiKey: String)
        suspend fun checkToken(): String?
        suspend fun reauthenticate()
        suspend fun logout()

        // Synchronous, no network call — just the JWT currently held by this instance (null if
        // it never authenticated yet). Any operation needing a JWT authenticates lazily on its
        // own first if this is null; whoever created the plugin can read the result back here
        // afterwards (e.g. to persist it), without a network round trip of its own.
        fun getToken(): String?
    }

    interface Serials {
        suspend fun list(): List<PluginSerial>
    }

    interface Serial {
        suspend fun get(): PluginSerial
        val chapters: Chapters
        fun chapter(chapterId: String): Chapter
    }

    interface Chapters {
        suspend fun list(): List<PluginChapter>
        suspend fun setRead(isRead: Boolean, chapterIds: List<String>)
    }

    interface Chapter {
        suspend fun get(): PluginChapter
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
