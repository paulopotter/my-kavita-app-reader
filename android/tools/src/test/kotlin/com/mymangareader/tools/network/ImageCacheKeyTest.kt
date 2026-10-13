package com.mymangareader.tools.network

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class ImageCacheKeyTest {
    @Test
    fun `the key is the path and query without host`() {
        assertEquals(
            "/api/reader/image?chapterId=1001&page=3",
            stableImageCacheKey("https://public.example.org/api/reader/image?chapterId=1001&page=3&apiKey=secret"),
        )
    }

    @Test
    fun `the same page behind different hosts shares one key`() {
        val lan = stableImageCacheKey("http://192.0.2.20:5150/api/reader/image?chapterId=1&page=2&apiKey=k")
        val dns = stableImageCacheKey("https://example.org/api/reader/image?chapterId=1&page=2&apiKey=k")

        assertEquals(lan, dns)
    }

    @Test
    fun `different pages keep different keys`() {
        val a = stableImageCacheKey("http://h/api/reader/image?chapterId=1&page=0&apiKey=k")
        val b = stableImageCacheKey("http://h/api/reader/image?chapterId=1&page=1&apiKey=k")

        assertFalse(a == b)
    }

    @Test
    fun `the api key never appears in the key, wherever it sits in the query`() {
        assertEquals("/p?a=1&b=2", stableImageCacheKey("http://h/p?apiKey=k&a=1&b=2"))
        assertEquals("/p?a=1", stableImageCacheKey("http://h/p?a=1&apiKey=k"))
        assertEquals("/p", stableImageCacheKey("http://h/p?apiKey=k"))
    }

    @Test
    fun `a url without a query keeps just its path`() {
        assertEquals("/cover.png", stableImageCacheKey("http://h:8080/cover.png"))
    }

    @Test
    fun `a string that is not a url is returned as it came`() {
        assertEquals("not a url", stableImageCacheKey("not a url"))
        assertEquals("", stableImageCacheKey(""))
    }

    @Test
    fun `redactApiKey hides only the key value`() {
        assertEquals(
            "http://h/api/reader/image?chapterId=1&page=0&apiKey=***&x=2",
            redactApiKey("http://h/api/reader/image?chapterId=1&page=0&apiKey=abcDEF123&x=2"),
        )
        assertEquals("no key here", redactApiKey("no key here"))
    }
}
