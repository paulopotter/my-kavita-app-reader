package com.mymangareader.tools.ota

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class OtaManifest(
    val lastRNVersion: String,
    val url: String,
    val bundleHash: String,
    val minKotlinVersion: String,
    val lastAppVersion: String,
    val policies: OtaPolicies? = null,
    // Epoch millis when this bundle was built (`make build-bundle`). Compared against the
    // embedded bundle's own build time to detect a stale OTA bundle after a local rebuild.
    val bundleBuildTimeMs: Long = 0L,
)

@Serializable
data class OtaPolicies(
    val required: List<OtaPolicyEntry> = emptyList(),
    @SerialName("highly_recommended") val highlyRecommended: List<OtaPolicyEntry> = emptyList(),
    val recommended: List<OtaPolicyEntry> = emptyList(),
)

@Serializable
data class OtaPolicyEntry(
    val type: String,
    val minVersion: String,
    val releaseNotesUrl: String,
)
