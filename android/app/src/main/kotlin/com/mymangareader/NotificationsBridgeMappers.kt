package com.mymangareader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.mymangareader.notifications.NotificationGroupInfo
import com.mymangareader.notifications.NotificationHistoryItem
import com.mymangareader.notifications.NotificationUrlInfo
import com.mymangareader.tools.network.UrlProbeResult

// toWritableMap()/toWritableArray() for :notifications' own types — kept out of
// NotificationsBridgeModule.kt (which stays focused on @ReactMethod + runCatching), same
// convention as ExternalMetadataBridgeMappers/DigestBridgeMappers.

fun NotificationGroupInfo.toWritableMap(): WritableMap =
    Arguments.createMap().apply {
        putString("id", id)
        putString("name", name)
        putString("providerId", providerId)
        putString("topic", topic)
        linkedServerGroupId?.let { putString("linkedServerGroupId", it) } ?: putNull("linkedServerGroupId")
    }

fun List<NotificationGroupInfo>.toGroupsWritableArray(): WritableArray =
    Arguments.createArray().also { arr ->
        forEach { arr.pushMap(it.toWritableMap()) }
    }

fun NotificationUrlInfo.toWritableMap(): WritableMap =
    Arguments.createMap().apply {
        putString("id", id)
        putString("groupId", groupId)
        putString("url", url)
        putInt("timeoutMs", timeoutMs)
        putInt("priority", priority)
        linkedServerUrlId?.let { putString("linkedServerUrlId", it) } ?: putNull("linkedServerUrlId")
    }

fun UrlProbeResult.toWritableMap(): WritableMap =
    Arguments.createMap().apply {
        putString("url", url)
        putBoolean("ok", ok)
        val statusCode = status
        if (statusCode != null) putInt("status", statusCode) else putNull("status")
        putDouble("elapsedMs", elapsedMs.toDouble())
    }

fun Pair<String, String>.toActiveGroupUrlWritableMap(): WritableMap =
    Arguments.createMap().apply {
        putString("groupId", first)
        putString("urlId", second)
    }

fun List<NotificationUrlInfo>.toUrlsWritableArray(): WritableArray =
    Arguments.createArray().also { arr ->
        forEach { arr.pushMap(it.toWritableMap()) }
    }

fun NotificationHistoryItem.toWritableMap(): WritableMap =
    Arguments.createMap().apply {
        putString("id", id)
        putString("seriesId", seriesId)
        putString("seriesName", seriesName)
        chapterId?.let { putString("chapterId", it) } ?: putNull("chapterId")
        chapterNumber?.let { putString("chapterNumber", it) } ?: putNull("chapterNumber")
        putDouble("detectedAtMs", detectedAtMs.toDouble())
        putBoolean("read", read)
        putDouble("createdAtLocalMs", createdAtLocalMs.toDouble())
    }

fun List<NotificationHistoryItem>.toHistoryWritableArray(): WritableArray =
    Arguments.createArray().also { arr ->
        forEach { arr.pushMap(it.toWritableMap()) }
    }
