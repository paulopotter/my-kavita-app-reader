package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface ExternalMetadataUrlDao {
    @Upsert
    suspend fun upsert(entity: ExternalMetadataUrlEntity)

    @Delete
    suspend fun delete(entity: ExternalMetadataUrlEntity)

    @Query("SELECT * FROM external_metadata_url WHERE groupId = :groupId ORDER BY priority ASC")
    fun observeByGroupId(groupId: String): Flow<List<ExternalMetadataUrlEntity>>

    @Query("SELECT * FROM external_metadata_url WHERE groupId = :groupId ORDER BY priority ASC")
    suspend fun getByGroupId(groupId: String): List<ExternalMetadataUrlEntity>

    // Used by ExternalMetadataServer.syncMatchByServerUrl to resolve which group a Kavita url is
    // linked to, without already knowing the group id (that's the whole point of the lookup).
    @Query("SELECT * FROM external_metadata_url")
    suspend fun getAll(): List<ExternalMetadataUrlEntity>

    @Query("SELECT * FROM external_metadata_url WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): ExternalMetadataUrlEntity?

    @Query("DELETE FROM external_metadata_url WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM external_metadata_url WHERE groupId = :groupId")
    suspend fun deleteByGroupId(groupId: String)
}
