package com.mymangareader.preferences

import com.mymangareader.core.database.PreferenceDao
import com.mymangareader.core.database.PreferenceEntity

// In-memory stand-in for PreferenceDao — PreferenceDao's own SQL behavior would be covered by a
// core PreferenceDaoTest (mirrors CacheDaoTest); Preferences' own tests only need something that
// behaves like a Map<(key, variant), PreferenceEntity>.
internal class FakePreferenceDao : PreferenceDao {
    private data class MapKey(val key: String, val variant: String)

    private val entities = mutableMapOf<MapKey, PreferenceEntity>()

    override suspend fun getByKey(key: String, variant: String): PreferenceEntity? = entities[MapKey(key, variant)]

    override suspend fun upsert(entity: PreferenceEntity) {
        entities[MapKey(entity.key, entity.variant)] = entity
    }

    override suspend fun deleteByKey(key: String, variant: String) {
        entities.remove(MapKey(key, variant))
    }

    override suspend fun deleteByDomain(domain: String) {
        entities.values.filter { it.domain == domain }.forEach { entities.remove(MapKey(it.key, it.variant)) }
    }
}
