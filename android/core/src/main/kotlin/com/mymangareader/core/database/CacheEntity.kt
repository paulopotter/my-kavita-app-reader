package com.mymangareader.core.database

import androidx.room.Entity
import androidx.room.PrimaryKey

// The single generic table backing Cache (Kotlin, :cache module)'s PERSISTENT mode — value is an
// opaque, caller-serialized string (Cache itself never parses it). domain is likewise opaque to
// Cache — a caller-chosen label ("page"/"chapter"/"series"/...) that only exists to make
// invalidateByDomain possible without Cache understanding what's inside value.
@Entity(tableName = "cache")
data class CacheEntity(
    @PrimaryKey val key: String,
    val value: String,
    val domain: String,
    val cachedAtEpochMs: Long,
    val expiresAtEpochMs: Long,
)
