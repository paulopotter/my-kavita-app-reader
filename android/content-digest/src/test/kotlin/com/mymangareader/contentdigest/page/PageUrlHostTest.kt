package com.mymangareader.contentdigest.page

import org.junit.Assert.assertEquals
import org.junit.Test

class PageUrlHostTest {
    private val path = "/api/reader/image?chapterId=1&page=0&apiKey=k"

    @Test
    fun `the host is swapped and the path and query kept`() {
        assertEquals("https://dns.example$path", rehostPageUrl("http://192.0.2.20:5150$path", "https://dns.example"))
    }

    @Test
    fun `a trailing slash on the base does not double up`() {
        assertEquals("https://dns.example$path", rehostPageUrl("http://x:1$path", "https://dns.example/"))
    }

    @Test
    fun `a base with its own path prefix is kept in front of the page path`() {
        assertEquals("https://dns.example/kavita$path", rehostPageUrl("http://x:1/kavita$path", "https://dns.example/kavita"))
    }

    @Test
    fun `no active base leaves the url alone`() {
        assertEquals("http://x:1$path", rehostPageUrl("http://x:1$path", null))
        assertEquals("http://x:1$path", rehostPageUrl("http://x:1$path", "  "))
    }

    @Test
    fun `a url that is not a page image is left alone`() {
        assertEquals("http://x:1/cover/1.png", rehostPageUrl("http://x:1/cover/1.png", "https://dns.example"))
    }
}
