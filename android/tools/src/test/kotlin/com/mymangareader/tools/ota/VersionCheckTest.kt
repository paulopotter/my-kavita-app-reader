package com.mymangareader.tools.ota

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class VersionCheckTest {

    // ── Kotlin / RN semver ─────────────────────────────────────────────────────

    @Test fun `semver equal versions meet minimum`() {
        assertTrue(meetsMinKotlinVersion("1.2.3", "1.2.3"))
        assertTrue(meetsMinRnVersion("2.0.0", "2.0.0"))
    }

    @Test fun `semver greater patch meets minimum`() {
        assertTrue(meetsMinKotlinVersion("0.1.1", "0.1.0"))
    }

    @Test fun `semver greater minor meets minimum`() {
        assertTrue(meetsMinKotlinVersion("0.2.0", "0.1.9"))
    }

    @Test fun `semver greater major meets minimum`() {
        assertTrue(meetsMinKotlinVersion("1.0.0", "0.9.9"))
    }

    @Test fun `semver lesser version does not meet minimum`() {
        assertFalse(meetsMinKotlinVersion("0.1.0", "0.1.1"))
        assertFalse(meetsMinRnVersion("1.5.0", "1.9.0"))
    }

    @Test fun `semver malformed actual returns false`() {
        assertFalse(meetsMinKotlinVersion("not-a-version", "1.0.0"))
        assertFalse(meetsMinRnVersion("", "1.0.0"))
    }

    @Test fun `semver malformed minimum returns false`() {
        assertFalse(meetsMinKotlinVersion("1.0.0", "bad"))
    }

    // ── App version (datetime tag) ─────────────────────────────────────────────

    @Test fun `app version equal meets minimum`() {
        assertTrue(meetsMinAppVersion("2026.08.10.1415", "2026.08.10.1415"))
    }

    @Test fun `app version greater minute meets minimum`() {
        assertTrue(meetsMinAppVersion("2026.08.10.1500", "2026.08.10.1415"))
    }

    @Test fun `app version greater day meets minimum`() {
        assertTrue(meetsMinAppVersion("2026.08.11.0000", "2026.08.10.2359"))
    }

    @Test fun `app version lesser does not meet minimum`() {
        assertFalse(meetsMinAppVersion("2026.08.09.1415", "2026.08.10.1415"))
    }

    @Test fun `app version malformed returns false`() {
        assertFalse(meetsMinAppVersion("not-a-date", "2026.08.10.1415"))
        assertFalse(meetsMinAppVersion("2026.08.10", "2026.08.10.1415"))
    }
}
