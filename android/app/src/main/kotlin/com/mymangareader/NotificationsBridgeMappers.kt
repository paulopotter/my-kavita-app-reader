package com.mymangareader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.mymangareader.notifications.NotificationGroupInfo
import com.mymangareader.notifications.NotificationHistoryItem
import com.mymangareader.notifications.NotificationUrlInfo

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
    }

fun NotificationHistoryItem.toWritableMap(): WritableMap =
    Arguments.createMap().apply {
        putString("id", id)
        putString("seriesId", seriesId)
        putString("seriesName", seriesName)
        putArray("chapterIds", chapterIds?.let { ids -> Arguments.createArray().also { arr -> ids.forEach { arr.pushString(it) } } })
        putArray(
            "chapterNumbers",
            chapterNumbers?.let { numbers -> Arguments.createArray().also { arr -> numbers.forEach { arr.pushString(it) } } },
        )
        putDouble("detectedAtMs", detectedAtMs.toDouble())
        putBoolean("read", read)
        putDouble("createdAtLocalMs", createdAtLocalMs.toDouble())
    }

fun List<NotificationHistoryItem>.toHistoryWritableArray(): WritableArray =
    Arguments.createArray().also { arr ->
        forEach { arr.pushMap(it.toWritableMap()) }
    }
