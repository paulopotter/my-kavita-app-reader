package com.mymangareader.features.kavita

import kotlinx.serialization.Serializable

@Serializable
internal data class UserDto(
    val username: String,
    val token: String,
    val refreshToken: String? = null,
)
