package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface AuthConfigDao {
    @Upsert
    suspend fun upsert(entity: AuthConfigEntity)

    @Query("SELECT * FROM auth_config WHERE id = 'auth' LIMIT 1")
    fun observe(): Flow<AuthConfigEntity?>

    @Query("SELECT * FROM auth_config WHERE id = 'auth' LIMIT 1")
    suspend fun get(): AuthConfigEntity?
}
