package com.mymangareader.tools.ota

import kotlinx.serialization.Serializable

const val N_STABLE = 3

@Serializable
data class OtaState(
    val currentBundleVersion: String = "",
    val bootCount: Int = 0,
    val isStable: Boolean = false,
    val crashDetected: Boolean = false,
)
