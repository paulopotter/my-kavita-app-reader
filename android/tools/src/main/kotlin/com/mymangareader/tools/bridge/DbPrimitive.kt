package com.mymangareader.tools.bridge

import kotlinx.coroutines.flow.Flow

interface DbPrimitive {
    suspend fun query(key: String): String?
    suspend fun write(key: String, value: String)
    fun observe(key: String): Flow<String?>
}
