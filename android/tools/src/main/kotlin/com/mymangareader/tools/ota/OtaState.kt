package com.mymangareader.tools.ota

import kotlinx.serialization.Serializable

const val N_STABLE = 3

@Serializable
data class OtaState(
    val currentBundleVersion: String = "",
    val bootCount: Int = 0,
    val isStable: Boolean = false,
    val crashDetected: Boolean = false,
    // bundleBuildTimeMs from the manifest this OTA bundle was downloaded from (epoch millis).
    // Compared against the embedded bundle's own build time to detect a stale OTA bundle after
    // a local rebuild — see OtaManager.discardStaleBundleIfNeeded.
    val bundleBuildTimeMs: Long = 0L,
)
