package com.mymangareader.server

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ImageDescriptorTest {

    private val fakeServer = ServerActiveInfo(
        groupId = "g1", groupName = "Group", providerId = "kavita",
        urlId = "u1", url = "http://fake", timeoutMs = 5000, priority = 0,
    )

    @Test
    fun `landscape when aspectRatio greater than 1`() {
        val descriptor = buildImageDescriptor(
            url = "http://fake/img", width = 1600, height = 900,
            resolvedAtEpochMs = 1L, server = fakeServer,
        )

        assertEquals(ImageOrientation.LANDSCAPE, descriptor.orientation)
        assertTrue(descriptor.hasFetchedDimensions)
        assertEquals(1600.0 / 900.0, descriptor.aspectRatio!!, 0.0001)
    }

    @Test
    fun `portrait when aspectRatio less than 1`() {
        val descriptor = buildImageDescriptor(
            url = "http://fake/img", width = 900, height = 1600,
            resolvedAtEpochMs = 1L, server = fakeServer,
        )

        assertEquals(ImageOrientation.PORTRAIT, descriptor.orientation)
    }

    @Test
    fun `orientation is null for a perfect square`() {
        val descriptor = buildImageDescriptor(
            url = "http://fake/img", width = 500, height = 500,
            resolvedAtEpochMs = 1L, server = fakeServer,
        )

        assertNull(descriptor.orientation)
        assertEquals(1.0, descriptor.aspectRatio)
    }

    @Test
    fun `a zero dimension counts as not fetched, not as a usable value`() {
        val descriptor = buildImageDescriptor(
            url = "http://fake/img", width = 0, height = 0,
            resolvedAtEpochMs = 1L, server = fakeServer,
        )

        assertFalse(descriptor.hasFetchedDimensions)
        assertNull(descriptor.aspectRatio)
        assertNull(descriptor.orientation)
        assertEquals(0, descriptor.width)
        assertEquals(0, descriptor.height)
    }

    @Test
    fun `null width or height means dimensions were never fetched`() {
        val descriptor = buildImageDescriptor(
            url = "http://fake/img", width = null, height = null,
            resolvedAtEpochMs = 1L, server = fakeServer,
        )

        assertFalse(descriptor.hasFetchedDimensions)
        assertNull(descriptor.aspectRatio)
        assertNull(descriptor.orientation)
    }

    @Test
    fun `cache defaults to null`() {
        val descriptor = buildImageDescriptor(
            url = "http://fake/img", width = null, height = null,
            resolvedAtEpochMs = 1L, server = fakeServer,
        )

        assertNull(descriptor.cache)
    }
}
