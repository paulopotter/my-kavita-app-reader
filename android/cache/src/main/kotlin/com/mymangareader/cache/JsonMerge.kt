package com.mymangareader.cache

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject

private val mergeJson = Json { ignoreUnknownKeys = true }

/**
 * Merges [incoming] onto [existing]. Both are opaque strings that MIGHT be JSON objects.
 *
 * - Either side isn't a JSON object (not JSON, a bare value, an array) → [incoming] is returned
 *   unchanged: merge degrades to a plain overwrite.
 * - Both parse as JSON objects → keys from [incoming] win / are added; keys only in [existing] are
 *   kept. How a key present on both sides is combined depends on [deep]:
 *   - `deep = false` (SHALLOW, the default): every top-level value from [incoming] replaces the
 *     one in [existing] wholesale — nested objects and arrays are swapped, never merged.
 *   - `deep = true`: when a key holds an object on BOTH sides, those objects are merged
 *     recursively (same rules, all the way down). Any non-object value — a scalar, an array, or a
 *     type mismatch (object vs scalar) — is still replaced wholesale by [incoming]'s. Arrays are
 *     never element-merged in either mode.
 *
 * SHALLOW is the default because the current caller ([CacheStore.patch]'s only user) rebuilds
 * every sub-object it knows about in full each write, so there's nothing partial to deep-merge.
 * `deep = true` exists for a future caller that sends genuinely partial nested payloads.
 */
internal fun jsonMerge(existing: String, incoming: String, deep: Boolean = false): String {
    val existingObj = existing.toJsonObjectOrNull() ?: return incoming
    val incomingObj = incoming.toJsonObjectOrNull() ?: return incoming
    val merged = if (deep) deepMerge(existingObj, incomingObj) else JsonObject(existingObj + incomingObj)
    return mergeJson.encodeToString(JsonObject.serializer(), merged)
}

private fun deepMerge(base: JsonObject, over: JsonObject): JsonObject {
    val out = base.toMutableMap()
    for ((k, overValue) in over) {
        val baseValue = out[k]
        out[k] = if (baseValue is JsonObject && overValue is JsonObject) {
            deepMerge(baseValue, overValue)
        } else {
            overValue
        }
    }
    return JsonObject(out)
}

private fun String.toJsonObjectOrNull(): JsonObject? = runCatching {
    mergeJson.parseToJsonElement(this).jsonObject
}.getOrNull()
