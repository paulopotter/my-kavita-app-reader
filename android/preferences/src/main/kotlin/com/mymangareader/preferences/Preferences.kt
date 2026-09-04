package com.mymangareader.preferences

import com.mymangareader.core.database.PreferenceDao
import com.mymangareader.core.database.PreferenceEntity
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Generic key-value preference store — knows nothing about any domain (chapter sort, library
 * view, ...). Every `domain`/`value` it stores is an opaque, caller-chosen string; Preferences
 * never parses or interprets either. Same shape as [com.mymangareader.cache.Cache] minus the
 * TTL/expiration concept: a preference is a source of truth (never recomputed elsewhere), so
 * there is nothing to purge by age, only overwrite (put) or remove on purpose (delete).
 *
 * Single Room-backed store — unlike Cache there is no persistent/memoryKotlin/network split, since
 * a real user preference has no "in-memory only" or "single-flight network" use case.
 *
 * variant/key together identify one entry — same convention as Cache: variant names which
 * parameter(s) a value's shape depends on, key carries the entity id (or "" when there is none,
 * with the distinguishing value moved into variant instead — e.g. a global preference).
 */
@Singleton
class Preferences
    @Inject
    constructor(
        private val preferenceDao: PreferenceDao,
    ) {
        suspend fun get(
            key: String,
            variant: String = "",
        ): PreferenceEntry? {
            val entity = preferenceDao.getByKey(key, variant) ?: return null
            return PreferenceEntry(value = entity.value, updatedAtEpochMs = entity.updatedAtEpochMs)
        }

        suspend fun put(
            key: String,
            value: String,
            domain: String,
            variant: String = "",
        ): PreferenceDescriptor {
            val now = System.currentTimeMillis()
            preferenceDao.upsert(
                PreferenceEntity(
                    key = key,
                    variant = variant,
                    value = value,
                    domain = domain,
                    updatedAtEpochMs = now,
                ),
            )
            return PreferenceDescriptor(key = key, variant = variant, domain = domain, updatedAtEpochMs = now)
        }

        suspend fun delete(
            key: String,
            variant: String = "",
        ) = preferenceDao.deleteByKey(key, variant)

        suspend fun deleteDomain(domain: String) = preferenceDao.deleteByDomain(domain)
    }
