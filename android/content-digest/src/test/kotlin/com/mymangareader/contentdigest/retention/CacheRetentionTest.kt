package com.mymangareader.contentdigest.retention

import com.mymangareader.core.database.CacheRetentionDao
import com.mymangareader.core.database.CacheRetentionRow
import com.mymangareader.core.database.FollowedSeriesDao
import com.mymangareader.core.database.FollowedSeriesEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

private const val HOUR = 60L * 60 * 1000
private const val NOW = 1_000_000_000_000L

private class FakeRetentionDao(
    private val rows: MutableList<CacheRetentionRow>,
) : CacheRetentionDao {
    override suspend fun rowsLastAccessedBefore(cutoffEpochMs: Long) = rows.filter { it.lastAccessedAtEpochMs < cutoffEpochMs }

    override suspend fun delete(
        key: String,
        variant: String,
    ) {
        rows.removeAll { it.key == key && it.variant == variant }
    }

    fun keys() = rows.map { it.key }
}

private class FakeFollowedDao(
    private val ids: List<String>,
) : FollowedSeriesDao {
    override suspend fun getAllIds() = ids

    override fun observeAllIds(): Flow<List<String>> = flowOf(ids)

    override suspend fun isFollowed(seriesId: String) = seriesId in ids

    override suspend fun follow(entity: FollowedSeriesEntity) = Unit

    override suspend fun unfollow(seriesId: String) = Unit
}

class CacheRetentionTest {
    private fun row(
        key: String,
        domain: String,
        hoursIdle: Long,
        seriesId: String? = null,
        url: String? = null,
    ) = CacheRetentionRow(
        key = key,
        variant = "",
        domain = domain,
        lastAccessedAtEpochMs = NOW - hoursIdle * HOUR,
        seriesIdHint = seriesId?.let { """$it","title":"x"""" },
        urlHint = url?.let { """$it","hasFetchedDimensions":true""" },
    )

    private fun retention(
        rows: MutableList<CacheRetentionRow>,
        followed: List<String> = emptyList(),
        removed: MutableList<String> = mutableListOf(),
    ) = Triple(
        FakeRetentionDao(rows).also { dao = it },
        CacheRetention(dao, FakeFollowedDao(followed)) { removed.add(it) },
        removed,
    )

    private lateinit var dao: FakeRetentionDao

    @Test
    fun `a series not followed is dropped after a day idle and kept before it`() =
        runTest {
            val rows = mutableListOf(row("s1:false:true", "serial", 25), row("s2:false:true", "serial", 23))
            val (_, retention, _) = retention(rows)

            retention.sweep(NOW)

            assertEquals(listOf("s2:false:true"), dao.keys())
        }

    @Test
    fun `a followed series survives past a day but not past three`() =
        runTest {
            val rows = mutableListOf(row("s1:false:true", "serial", 30), row("s2:false:true", "serial", 80))
            val (_, retention, _) = retention(rows, followed = listOf("s1", "s2"))

            retention.sweep(NOW)

            assertEquals(listOf("s1:false:true"), dao.keys())
        }

    @Test
    fun `chapter and page rows take their series from the value`() =
        runTest {
            val rows =
                mutableListOf(
                    row("c1:true", "chapter", 30, seriesId = "7"), // followed -> kept
                    row("c2:true", "chapter", 30, seriesId = "8"), // not followed -> dropped
                )
            val (_, retention, _) = retention(rows, followed = listOf("7"))

            retention.sweep(NOW)

            assertEquals(listOf("c1:true"), dao.keys())
        }

    @Test
    fun `a dropped page row also removes its image from the image cache`() =
        runTest {
            val rows =
                mutableListOf(
                    row("c1:0", "page", 30, seriesId = "8", url = "https://h/api/reader/image?chapterId=1&page=0&apiKey=k"),
                    row("c1:1", "page", 2, seriesId = "8", url = "https://h/api/reader/image?chapterId=1&page=1&apiKey=k"),
                )
            val removed = mutableListOf<String>()
            val (_, retention, _) = retention(rows, removed = removed)

            val result = retention.sweep(NOW)

            assertEquals(listOf("https://h/api/reader/image?chapterId=1&page=0&apiKey=k"), removed)
            assertEquals(1, result.imagesRemoved)
            assertEquals(1, result.rowsDeleted)
            assertEquals(listOf("c1:1"), dao.keys())
        }

    @Test
    fun `an escaped url in the json is restored before removing the image`() =
        runTest {
            val rows = mutableListOf(row("c1:0", "page", 30, seriesId = "8", url = "https:\\/\\/h\\/img?a=1\\u0026b=2"))
            val removed = mutableListOf<String>()
            val (_, retention, _) = retention(rows, removed = removed)

            retention.sweep(NOW)

            assertEquals(listOf("https://h/img?a=1&b=2"), removed)
        }

    @Test
    fun `a row whose series cannot be told counts as not followed`() =
        runTest {
            val rows = mutableListOf(row("c9:true", "chapter", 30, seriesId = null))
            val (_, retention, _) = retention(rows, followed = listOf("7"))

            retention.sweep(NOW)

            assertTrue(dao.keys().isEmpty())
        }

    @Test
    fun `domains it does not know are left alone`() =
        runTest {
            val rows = mutableListOf(row("m1", "externalMetadata:match", 500))
            val (_, retention, _) = retention(rows)

            val result = retention.sweep(NOW)

            assertEquals(listOf("m1"), dao.keys())
            assertEquals(0, result.rowsDeleted)
        }

    @Test
    fun `nothing idle means nothing deleted and the followed list is not even read`() =
        runTest {
            val rows = mutableListOf(row("s1:false:true", "serial", 1))
            val (_, retention, _) = retention(rows)

            assertEquals(CacheRetentionResult(0, 0), retention.sweep(NOW))
        }
}
