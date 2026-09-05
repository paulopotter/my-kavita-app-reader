package com.mymangareader.notifications.plugins.ntfy

import com.mymangareader.notifications.plugins.RawNotificationEvent
import kotlinx.serialization.Serializable

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
 * so a publisher that omits them entirely still decodes.
 */
@Serializable
data class NtfyEventDto(
    val seriesId: String? = null,
    val seriesName: String,
    val chapterIds: List<String>? = null,
    val chapterNumbers: List<String>? = null,
    val detectedAtMs: Long,
)

fun NtfyEventDto.toRawNotificationEvent() =
    RawNotificationEvent(
        seriesId = seriesId,
        seriesName = seriesName,
        chapterIds = chapterIds,
        chapterNumbers = chapterNumbers,
        detectedAtMs = detectedAtMs,
    )
