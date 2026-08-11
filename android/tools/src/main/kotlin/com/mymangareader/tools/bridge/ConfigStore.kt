package com.mymangareader.tools.bridge

import com.mymangareader.core.database.AuthConfigDao
import com.mymangareader.core.database.AuthConfigEntity
import com.mymangareader.core.database.BffServerConfigDao
import com.mymangareader.core.database.BffServerConfigEntity
import com.mymangareader.core.database.ServerConfigDao
import com.mymangareader.core.database.ServerConfigEntity
import com.mymangareader.core.database.UiPreferencesDao
import com.mymangareader.core.database.UiPreferencesEntity
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ConfigStore @Inject constructor(
    private val serverConfigDao: ServerConfigDao,
    private val authConfigDao: AuthConfigDao,
    private val uiPreferencesDao: UiPreferencesDao,
    private val bffServerConfigDao: BffServerConfigDao,
) {
    // ── Server config ──────────────────────────────────────────────────────────

    suspend fun getServerConfigs(): List<ServerConfigEntity> = serverConfigDao.getAll()

    fun observeServerConfigs(): Flow<List<ServerConfigEntity>> = serverConfigDao.observeAll()

    suspend fun upsertServerConfig(entity: ServerConfigEntity) = serverConfigDao.upsert(entity)

    suspend fun deleteServerConfig(id: String) = serverConfigDao.deleteById(id)

    // ── Auth config ────────────────────────────────────────────────────────────

    suspend fun getAuthConfig(): AuthConfigEntity? = authConfigDao.get()

    fun observeAuthConfig(): Flow<AuthConfigEntity?> = authConfigDao.observe()

    suspend fun upsertAuthConfig(entity: AuthConfigEntity) = authConfigDao.upsert(entity)

    // ── UI preferences ─────────────────────────────────────────────────────────

    suspend fun getUiPreferences(): UiPreferencesEntity = uiPreferencesDao.get() ?: UiPreferencesEntity()

    fun observeUiPreferences(): Flow<UiPreferencesEntity?> = uiPreferencesDao.observe()

    suspend fun upsertUiPreferences(update: UiPreferencesEntity.() -> UiPreferencesEntity) {
        val current = uiPreferencesDao.get() ?: UiPreferencesEntity()
        uiPreferencesDao.upsert(current.update())
    }

    // ── BFF server config ──────────────────────────────────────────────────────

    suspend fun getBffServerConfigs(): List<BffServerConfigEntity> = bffServerConfigDao.getAll()

    suspend fun insertBffServerConfig(entity: BffServerConfigEntity) = bffServerConfigDao.insert(entity)

    suspend fun deleteBffServerConfig(id: String) = bffServerConfigDao.deleteById(id)
}
