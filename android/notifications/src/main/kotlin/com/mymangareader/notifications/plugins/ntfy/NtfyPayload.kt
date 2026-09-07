package com.mymangareader.notifications.plugins.ntfy

import com.mymangareader.notifications.plugins.RawNotificationEvent
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.decodeFromJsonElement

// ── Raw ntfy wire shapes — nothing outside plugins/ntfy/ ever sees these ───────────────────────

/**
 * The envelope ntfy itself sends over the WebSocket — the app's own payload is NOT the frame
 * body directly, it's double-encoded inside [message] as a JSON string. `event` is `"open"` on
 * the initial handshake frame (no [message] at all, [message] stays blank) and `"message"` for
 * every real publish afterward — any other value (`"keepalive"`, a future ntfy event type) is
 * ignored, never treated as an error.
 *
 * Example real frame: `{"id":"...","time":..,"event":"message","topic":"my-topic","message":"[{...}]"}`
 */
@Serializable
data class NtfyEnvelope(
    val event: String = "",
    val message: String = "",
)

/**
 * One element of this app's own payload contract (see this plan's README) — the JSON array that
 * lives, re-encoded as a string, inside [NtfyEnvelope.message]. Optional fields default to null
 * so a publisher that omits them entirely still decodes. [slug] is an external-matching
 * identifier (see [com.mymangareader.notifications.NotificationResolver]'s own doc on how it's
 * used) — a resolution AID, never a replacement for [seriesId].
 */
@Serializable
data class NtfyEventDto(
    val seriesId: String? = null,
    val seriesName: String,
    val slug: String? = null,
    val chapterIds: List<String>? = null,
    val chapterNumbers: List<String>? = null,
    val detectedAtMs: Long,
)

// A legacy publisher wraps the same event array inside an object instead of sending it bare —
// see [decodeNtfyEvents]'s own doc.
@Serializable
private data class NtfyEventsEnvelopeDto(
    val events: List<NtfyEventDto>,
)

/**
 * This app's payload contract accepts two shapes for the ntfy message body, both carrying the
 * same array of events — inspected structurally before decoding (never a blind try/catch cascade,
 * so an actually malformed payload of either shape still fails cleanly):
 *  - the documented shape: a bare JSON array (`[{...}, {...}]`).
 *  - a legacy publisher's shape: an object wrapping that same array (`{"events": [{...}, {...}]}`)
 *    — kept so an existing external publisher that already batches multiple events into one ntfy
 *    message under this key doesn't need to change.
 * Returns an empty list (never throws) for anything that isn't valid JSON, or valid JSON that's
 * neither shape — the caller (`NtfyPlugin.handleFrame`) treats that as "nothing to notify about".
 */
fun decodeNtfyEvents(json: Json, message: String): List<NtfyEventDto> {
    val root = runCatching { json.parseToJsonElement(message) }.getOrNull() ?: return emptyList()
    val array =
        when (root) {
            is JsonArray -> root
            is JsonObject -> root["events"]?.let { it as? JsonArray } ?: return emptyList()
            else -> return emptyList()
        }
    return runCatching { json.decodeFromJsonElement<List<NtfyEventDto>>(array) }.getOrNull() ?: emptyList()
}

fun NtfyEventDto.toRawNotificationEvent() =
    RawNotificationEvent(
        seriesId = seriesId,
        seriesName = seriesName,
        slug = slug,
        chapterIds = chapterIds,
        chapterNumbers = chapterNumbers,
        detectedAtMs = detectedAtMs,
    )
