package com.mymangareader

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DeepLinkNormalizerTest {
    @Test
    fun `normaliza custom scheme series para deeplink series`() {
        assertEquals("deeplink://series/123", normalizeDeepLinkUri("mymangareader://series/123"))
    }

    @Test
    fun `normaliza custom scheme reader para deeplink reader`() {
        assertEquals("deeplink://reader/123/456", normalizeDeepLinkUri("mymangareader://reader/123/456"))
    }

    @Test
    fun `normaliza host https configurado, removendo o host`() {
        assertEquals("deeplink://series/123", normalizeDeepLinkUri("https://myhost.example/series/123"))
    }

    @Test
    fun `normaliza host http configurado, removendo o host`() {
        assertEquals("deeplink://reader/123/456", normalizeDeepLinkUri("http://myhost.example:8080/reader/123/456"))
    }

    @Test
    fun `retorna null para custom scheme sem path`() {
        assertNull(normalizeDeepLinkUri("mymangareader://"))
    }

    @Test
    fun `retorna null para host http sem path`() {
        assertNull(normalizeDeepLinkUri("https://myhost.example"))
    }

    @Test
    fun `retorna null para host http com apenas barra final`() {
        assertNull(normalizeDeepLinkUri("https://myhost.example/"))
    }
}
