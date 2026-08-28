package com.mymangareader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.mymangareader.preferences.PreferenceDescriptor
import com.mymangareader.preferences.PreferenceEntry

fun PreferenceEntry.toWritableMap(): WritableMap = Arguments.createMap().apply {
    putString("value", value)
    putDouble("updatedAtEpochMs", updatedAtEpochMs.toDouble())
}

fun PreferenceDescriptor.toWritableMap(): WritableMap = Arguments.createMap().apply {
    putString("key", key)
    putString("variant", variant)
    putString("domain", domain)
    putDouble("updatedAtEpochMs", updatedAtEpochMs.toDouble())
}
