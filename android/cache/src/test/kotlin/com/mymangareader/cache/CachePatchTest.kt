package com.mymangareader.cache

import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

// CacheStore.patch — the JSON-merge write (shallow by default, deep opt-in). Tested through
// PersistentHandle (the default impl on the interface: get → jsonMerge → put). MemoryKotlinHandle
// shares that exact default so one set of cases covers both.
class CachePatchTest {
    private val json = Json { ignoreUnknownKeys = true }

    private fun obj(s: String): Map<String, *> = json.parseToJsonElement(s).jsonObject

    @Test
    fun `patch on a missing key behaves like put`() =
        runTest {
            val cache = PersistentHandle(FakeCacheDao())
            cache.patch("s1", """{"a":1}""", domain = "serial")
            assertEquals("""{"a":1}""".let(::obj), cache.get("s1")?.value?.let(::obj))
        }

    @Test
    fun `patch keeps fields the new value does not mention and overwrites the ones it does`() =
        runTest {
            val cache = PersistentHandle(FakeCacheDao())
            cache.put("s1", """{"name":"Old","chapters":{"total":10},"pages":{"read":1,"total":100}}""", domain = "serial")

            cache.patch("s1", """{"name":"New","pages":{"read":5,"total":100}}""", domain = "serial")

            val merged = obj(cache.get("s1")!!.value)
            assertEquals("New", merged["name"].toString().trim('"'))
            // chapters was NOT in the patch → preserved
            assertEquals("""{"total":10}""".let(::obj), (merged["chapters"] as JsonObject))
            // pages WAS in the patch → replaced wholesale (shallow)
            assertEquals("""{"read":5,"total":100}""".let(::obj), (merged["pages"] as JsonObject))
        }

    @Test
    fun `shallow (default) replaces nested objects wholesale`() =
        runTest {
            val cache = PersistentHandle(FakeCacheDao())
            cache.put("s1", """{"pages":{"read":1,"total":100}}""", domain = "serial")

            // patch only sets pages.read — shallow means pages.total is dropped
            cache.patch("s1", """{"pages":{"read":9}}""", domain = "serial")

            assertEquals("""{"read":9}""".let(::obj), obj(cache.get("s1")!!.value)["pages"] as JsonObject)
        }

    @Test
    fun `deep = true merges nested objects recursively, keeping sibling keys`() =
        runTest {
            val cache = PersistentHandle(FakeCacheDao())
            cache.put("s1", """{"name":"Old","pages":{"read":1,"total":100},"meta":{"a":{"x":1,"y":2}}}""", domain = "serial")

            cache.patch("s1", """{"name":"New","pages":{"read":9},"meta":{"a":{"y":9},"b":1}}""", domain = "serial", deep = true)

            val merged = obj(cache.get("s1")!!.value)
            assertEquals("New", merged["name"].toString().trim('"'))
            // pages.read updated, pages.total kept
            assertEquals("""{"read":9,"total":100}""".let(::obj), merged["pages"] as JsonObject)
            // meta.a.y updated, meta.a.x kept, meta.b added
            assertEquals("""{"a":{"x":1,"y":9},"b":1}""".let(::obj), merged["meta"] as JsonObject)
        }

    @Test
    fun `deep = true still replaces a value wholesale when the types differ (object vs scalar)`() =
        runTest {
            val cache = PersistentHandle(FakeCacheDao())
            cache.put("s1", """{"x":{"a":1}}""", domain = "serial")

            cache.patch("s1", """{"x":5}""", domain = "serial", deep = true)

            assertEquals("5", obj(cache.get("s1")!!.value)["x"].toString())
        }

    @Test
    fun `deep = true never element-merges arrays`() =
        runTest {
            val cache = PersistentHandle(FakeCacheDao())
            cache.put("s1", """{"list":[1,2,3]}""", domain = "serial")

            cache.patch("s1", """{"list":[9]}""", domain = "serial", deep = true)

            assertEquals("[9]", obj(cache.get("s1")!!.value)["list"].toString())
        }

    @Test
    fun `patch degrades to put when the existing value is not a JSON object`() =
        runTest {
            val cache = PersistentHandle(FakeCacheDao())
            cache.put("s1", "not json", domain = "serial")

            cache.patch("s1", """{"a":1}""", domain = "serial")

            assertEquals("""{"a":1}""".let(::obj), obj(cache.get("s1")!!.value))
        }

    @Test
    fun `patch degrades to put when the new value is not a JSON object`() =
        runTest {
            val cache = PersistentHandle(FakeCacheDao())
            cache.put("s1", """{"a":1}""", domain = "serial")

            cache.patch("s1", "\"plain string\"", domain = "serial")

            assertEquals("\"plain string\"", cache.get("s1")?.value)
        }

    @Test
    fun `patch refreshes cachedAt and returns a descriptor`() =
        runTest {
            val cache = PersistentHandle(FakeCacheDao())
            cache.put("s1", """{"a":1}""", domain = "serial", ttlMs = 60_000L)
            val firstAt = cache.get("s1")!!.cachedAtEpochMs

            Thread.sleep(2)
            val descriptor = cache.patch("s1", """{"b":2}""", domain = "serial", ttlMs = 60_000L)

            assertEquals("s1", descriptor.key)
            assertEquals("serial", descriptor.domain)
            assert(cache.get("s1")!!.cachedAtEpochMs >= firstAt)
            assertEquals("""{"a":1,"b":2}""".let(::obj), obj(cache.get("s1")!!.value))
        }

    @Test
    fun `variant scopes the entry patch touches`() =
        runTest {
            val cache = PersistentHandle(FakeCacheDao())
            cache.put("s1", """{"a":1}""", domain = "serial", variant = "full")
            cache.patch("s1", """{"b":2}""", domain = "serial", variant = "other")

            assertEquals("""{"a":1}""".let(::obj), obj(cache.get("s1", "full")!!.value))
            assertEquals("""{"b":2}""".let(::obj), obj(cache.get("s1", "other")!!.value))
            assertNull(cache.get("s1", "missing"))
        }

    // ── patchAll (batch) ──────────────────────────────────────────────────────

    @Test
    fun `patchAll merges each item and returns descriptors in item order`() =
        runTest {
            val cache = PersistentHandle(FakeCacheDao())
            cache.put("s1", """{"name":"A","chapters":{"total":3}}""", domain = "serial", variant = "v")
            cache.put("s2", """{"name":"B"}""", domain = "serial", variant = "v")
            // s3 is new

            val descriptors =
                cache.patchAll(
                    listOf(
                        PatchItem("s1", """{"name":"A2"}"""),
                        PatchItem("s2", """{"name":"B2"}"""),
                        PatchItem("s3", """{"name":"C"}"""),
                    ),
                    domain = "serial",
                    variant = "v",
                )

            assertEquals(listOf("s1", "s2", "s3"), descriptors.map { it.key })
            assertEquals("A2", obj(cache.get("s1", "v")!!.value)["name"].toString().trim('"'))
            // chapters preserved (shallow merge, not in the patch)
            assertEquals("""{"total":3}""".let(::obj), obj(cache.get("s1", "v")!!.value)["chapters"] as JsonObject)
            assertEquals("B2", obj(cache.get("s2", "v")!!.value)["name"].toString().trim('"'))
            assertEquals("C", obj(cache.get("s3", "v")!!.value)["name"].toString().trim('"'))
        }

    @Test
    fun `patchAll with a domain-scoped readFilter still merges the right existing rows`() =
        runTest {
            val cache = PersistentHandle(FakeCacheDao())
            cache.put("s1", """{"name":"A","meta":1}""", domain = "serial", variant = "v")
            cache.put("s2", """{"name":"B","meta":2}""", domain = "serial", variant = "v")
            cache.put("other", """{"name":"X"}""", domain = "chapter", variant = "v") // different domain, must be ignored

            cache.patchAll(
                listOf(PatchItem("s1", """{"name":"A2"}"""), PatchItem("s2", """{"name":"B2"}""")),
                domain = "serial",
                variant = "v",
                readFilter = CacheFilter(domain = "serial", variant = "v"),
            )

            assertEquals(1, obj(cache.get("s1", "v")!!.value)["meta"].toString().toInt())
            assertEquals("A2", obj(cache.get("s1", "v")!!.value)["name"].toString().trim('"'))
            assertEquals("B2", obj(cache.get("s2", "v")!!.value)["name"].toString().trim('"'))
            assertEquals("X", obj(cache.get("other", "v")!!.value)["name"].toString().trim('"')) // untouched
        }

    @Test
    fun `patchAll on an empty list is a no-op`() =
        runTest {
            val cache = PersistentHandle(FakeCacheDao())
            assertEquals(emptyList(), cache.patchAll(emptyList(), domain = "serial"))
        }

    @Test
    fun `patch and a one-item patchAll produce the same merged result`() =
        runTest {
            val a = PersistentHandle(FakeCacheDao())
            a.put("s1", """{"a":1,"keep":true}""", domain = "serial")
            a.patch("s1", """{"a":2}""", domain = "serial")

            val b = PersistentHandle(FakeCacheDao())
            b.put("s1", """{"a":1,"keep":true}""", domain = "serial")
            b.patchAll(listOf(PatchItem("s1", """{"a":2}""")), domain = "serial")

            assertEquals(obj(a.get("s1")!!.value), obj(b.get("s1")!!.value))
        }
}
