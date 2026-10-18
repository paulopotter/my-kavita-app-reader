package com.mymangareader.cache

import com.mymangareader.core.database.CacheDao
import com.mymangareader.core.database.CacheEntity
import kotlinx.coroutines.test.runTest
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

// A cache row above the CursorWindow size can be written but never read back. These tests pin the
// two halves of the answer: such a value is never stored, and a row that already cannot be read
// is a miss that removes itself.
class CacheRowLimitTest {
    // Reads of the rows in [bigKeys] fail the way Android's CursorWindow does; everything else is a
    // plain in-memory DAO. Wide reads fail whenever the slice they cover contains one of them.
    private class OversizedRowsDao(
        private val inner: FakeCacheDao,
        private val bigKeys: Set<String>,
    ) : CacheDao by inner {
        override suspend fun getByKey(
            key: String,
            variant: String,
        ): CacheEntity? {
            if (key in bigKeys && inner.getByKey(key, variant) != null) throw tooBig()
            return inner.getByKey(key, variant)
        }

        override suspend fun queryFiltered(
            keys: List<String>,
            hasKeys: Int,
            domain: String?,
            variant: String?,
        ): List<CacheEntity> {
            val rows = inner.queryFiltered(keys, hasKeys, domain, variant)
            if (rows.any { it.key in bigKeys }) throw tooBig()
            return rows
        }

        private fun tooBig() = RuntimeException("Row too big to fit into CursorWindow requiredPos=0, totalRows=1")
    }

    private fun bigValue() = "\"" + "x".repeat(CACHE_MAX_VALUE_BYTES) + "\""

    @Test
    fun `a value above the limit is detected, one below it is not`() {
        assertFalse("\"small\"".exceedsCacheRowLimit())
        assertFalse(("\"" + "x".repeat(CACHE_MAX_VALUE_BYTES - 2) + "\"").exceedsCacheRowLimit())
        assertTrue(bigValue().exceedsCacheRowLimit())
    }

    @Test
    fun `the limit counts UTF-8 bytes, not characters`() {
        // 600k chars of a 3-byte character is 1.8 MB: under the limit in chars, over it in bytes.
        assertTrue("あ".repeat(600_000).exceedsCacheRowLimit())
        assertFalse("あ".repeat(400_000).exceedsCacheRowLimit())
    }

    @Test
    fun `the too-big error is recognised by name or by message, other errors are not`() {
        assertTrue(RuntimeException("Row too big to fit into CursorWindow requiredPos=208").isCacheRowTooBig())
        assertTrue(RuntimeException("row TOO BIG").isCacheRowTooBig())
        assertFalse(RuntimeException("database is locked").isCacheRowTooBig())
        assertFalse(RuntimeException().isCacheRowTooBig())
    }

    @Test
    fun `put does not store an oversized value and drops the older copy`() =
        runTest {
            val dao = FakeCacheDao()
            val persistent = PersistentHandle(dao)
            persistent.put("serial:1", "\"old\"", domain = "serial", variant = "full")

            val descriptor = persistent.put("serial:1", bigValue(), domain = "serial", variant = "full")

            assertNull(persistent.get("serial:1", "full"))
            assertEquals("serial:1", descriptor.key)
        }

    @Test
    fun `patchAll skips a merged value that would be oversized and drops the older copy, the rest is written`() =
        runTest {
            val dao = FakeCacheDao()
            val persistent = PersistentHandle(dao)
            persistent.put("serial:1", "{\"a\":1}", domain = "serial", variant = "full")

            val descriptors =
                persistent.patchAll(
                    items = listOf(PatchItem("serial:1", "{\"b\":\"${"x".repeat(CACHE_MAX_VALUE_BYTES)}\"}"), PatchItem("serial:2", "{\"b\":2}")),
                    domain = "serial",
                    variant = "full",
                )

            assertEquals(2, descriptors.size)
            assertNull(persistent.get("serial:1", "full"))
            assertNotNull(persistent.get("serial:2", "full"))
        }

    @Test
    fun `get treats a row too big to read as a miss and deletes it`() =
        runTest {
            val inner = FakeCacheDao()
            val persistent = PersistentHandle(OversizedRowsDao(inner, setOf("serial:big")))
            persistent.put("serial:big", "\"v\"", domain = "serial", variant = "full")

            assertNull(persistent.get("serial:big", "full"))
            assertNull(inner.getByKey("serial:big", "full"))
        }

    @Test
    fun `get still rethrows an error that is not about the row size`() =
        runTest {
            val failing =
                object : CacheDao by FakeCacheDao() {
                    override suspend fun getByKey(
                        key: String,
                        variant: String,
                    ): CacheEntity? = throw IllegalStateException("database is locked")
                }

            val result = runCatching { PersistentHandle(failing).get("k", "") }

            assertTrue(result.exceptionOrNull() is IllegalStateException)
        }

    @Test
    fun `a wide read that hits an oversized row returns the readable rows and removes the bad one`() =
        runTest {
            val inner = FakeCacheDao()
            val persistent = PersistentHandle(OversizedRowsDao(inner, setOf("serial:big")))
            persistent.put("serial:1", "{\"a\":1}", domain = "serial", variant = "full")
            persistent.put("serial:big", "{\"a\":2}", domain = "serial", variant = "full")
            persistent.put("serial:3", "{\"a\":3}", domain = "serial", variant = "full")

            val rows = OversizedRowsDao(inner, setOf("serial:big")).query(CacheFilter(domain = "serial", variant = "full"))

            assertEquals(setOf("serial:1", "serial:3"), rows.map { it.key }.toSet())
            assertNull(inner.getByKey("serial:big", "full"))
        }

    @Test
    fun `patchAll over a slice with an oversized row still merges the readable ones`() =
        runTest {
            val inner = FakeCacheDao()
            val dao = OversizedRowsDao(inner, setOf("serial:big"))
            val persistent = PersistentHandle(dao)
            persistent.put("serial:1", "{\"a\":1}", domain = "serial", variant = "full")
            persistent.put("serial:big", "{\"a\":2}", domain = "serial", variant = "full")

            persistent.patchAll(
                items = listOf(PatchItem("serial:1", "{\"b\":2}"), PatchItem("serial:big", "{\"b\":3}")),
                domain = "serial",
                variant = "full",
                readFilter = CacheFilter(domain = "serial", variant = "full"),
            )

            assertEquals("{\"a\":1,\"b\":2}", inner.getByKey("serial:1", "full")?.value)
            // The unreadable row was dropped, then rewritten from the fresh item alone.
            assertEquals("{\"b\":3}", inner.getByKey("serial:big", "full")?.value)
        }
}
