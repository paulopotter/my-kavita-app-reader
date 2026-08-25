package com.mymangareader.core.database

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface ExternalMetadataGroupDao {
    @Upsert
    suspend fun upsert(entity: ExternalMetadataGroupEntity)

    @Delete
    suspend fun delete(entity: ExternalMetadataGroupEntity)

    @Query("SELECT * FROM external_metadata_group")
    fun observeAll(): Flow<List<ExternalMetadataGroupEntity>>

    @Query("SELECT * FROM external_metadata_group")
    suspend fun getAll(): List<ExternalMetadataGroupEntity>

    @Query("SELECT * FROM external_metadata_group WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): ExternalMetadataGroupEntity?

    @Query("DELETE FROM external_metadata_group WHERE id = :id")
    suspend fun deleteById(id: String)
}
