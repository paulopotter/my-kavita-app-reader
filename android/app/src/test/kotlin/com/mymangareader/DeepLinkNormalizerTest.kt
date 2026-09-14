package com.mymangareader

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
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

    // ── extractSharedUrl ──

    @Test
    fun `extrai a url quando o texto compartilhado e so a url`() {
        assertEquals("https://myhost.example/series/123", extractSharedUrl("https://myhost.example/series/123"))
    }

    @Test
    fun `extrai a url do meio de um texto livre`() {
        assertEquals(
            "https://myhost.example/series/123",
            extractSharedUrl("Olha essa série: https://myhost.example/series/123 muito boa!"),
        )
    }

    @Test
    fun `extrai a primeira url quando ha mais de uma no texto`() {
        assertEquals(
            "http://myhost.example/series/1",
            extractSharedUrl("http://myhost.example/series/1 e depois https://outro.example/series/2"),
        )
    }

    @Test
    fun `retorna null quando o texto compartilhado nao tem nenhuma url http`() {
        assertNull(extractSharedUrl("um texto qualquer sem link"))
    }

    @Test
    fun `retorna null quando o texto compartilhado e null`() {
        assertNull(extractSharedUrl(null))
    }

    // ── consumeDeepLinkTapId ──

    @Test
    fun `um tap id nunca visto e consumido pela primeira vez`() {
        val result = consumeDeepLinkTapId("tap-1", alreadyConsumed = emptySet(), maxRemembered = 20)

        assertTrue(result.wasFirstSeen)
        assertEquals(setOf("tap-1"), result.consumed)
    }

    @Test
    fun `um tap id ja consumido e rejeitado, sem alterar o set`() {
        val alreadyConsumed = setOf("tap-1", "tap-2")

        val result = consumeDeepLinkTapId("tap-1", alreadyConsumed, maxRemembered = 20)

        assertFalse(result.wasFirstSeen)
        assertEquals(alreadyConsumed, result.consumed)
    }

    @Test
    fun `o cap descarta os ids mais antigos quando excede maxRemembered`() {
        val alreadyConsumed = (1..20).map { "tap-$it" }.toSet()

        val result = consumeDeepLinkTapId("tap-21", alreadyConsumed, maxRemembered = 20)

        assertTrue(result.wasFirstSeen)
        assertEquals(20, result.consumed.size)
        assertTrue("tap-21" in result.consumed)
    }

    @Test
    fun `dois tap ids diferentes sao ambos consumidos independentemente`() {
        val first = consumeDeepLinkTapId("tap-1", emptySet(), maxRemembered = 20)
        val second = consumeDeepLinkTapId("tap-2", first.consumed, maxRemembered = 20)

        assertTrue(first.wasFirstSeen)
        assertTrue(second.wasFirstSeen)
        assertEquals(setOf("tap-1", "tap-2"), second.consumed)
    }
}
