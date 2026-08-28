package com.mymangareader.preferences

import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlinx.coroutines.test.runTest
import org.junit.Test

class PreferencesTest {

    @Test
    fun `get retorna null quando a chave nunca foi gravada`() = runTest {
        val preferences = Preferences(FakePreferenceDao())

        assertNull(preferences.get("missing"))
    }

    @Test
    fun `put seguido de get retorna o value gravado`() = runTest {
        val preferences = Preferences(FakePreferenceDao())

        preferences.put("global", "\"BY_NUMBER_DESC\"", domain = "chapterSortPrefs")
        val result = preferences.get("global")

        assertEquals("\"BY_NUMBER_DESC\"", result?.value)
    }

    @Test
    fun `put retorna um PreferenceDescriptor refletindo o que foi escrito`() = runTest {
        val preferences = Preferences(FakePreferenceDao())

        val descriptor = preferences.put("global", "\"BY_NUMBER_DESC\"", domain = "chapterSortPrefs", variant = "s1")

        assertEquals("global", descriptor.key)
        assertEquals("s1", descriptor.variant)
        assertEquals("chapterSortPrefs", descriptor.domain)
    }

    @Test
    fun `put sobrescreve o value anterior da mesma chave e variant`() = runTest {
        val preferences = Preferences(FakePreferenceDao())
        preferences.put("global", "\"BY_NUMBER_DESC\"", domain = "chapterSortPrefs")

        preferences.put("global", "\"BY_NUMBER_ASC\"", domain = "chapterSortPrefs")

        assertEquals("\"BY_NUMBER_ASC\"", preferences.get("global")?.value)
    }

    @Test
    fun `mesma key com variants diferentes coexistem sem colidir`() = runTest {
        val preferences = Preferences(FakePreferenceDao())

        preferences.put("global", "\"BY_NUMBER_DESC\"", domain = "chapterSortPrefs", variant = "s1")
        preferences.put("global", "\"BY_NUMBER_ASC\"", domain = "chapterSortPrefs", variant = "s2")

        assertEquals("\"BY_NUMBER_DESC\"", preferences.get("global", variant = "s1")?.value)
        assertEquals("\"BY_NUMBER_ASC\"", preferences.get("global", variant = "s2")?.value)
    }

    @Test
    fun `delete remove apenas a chave e variant indicados`() = runTest {
        val preferences = Preferences(FakePreferenceDao())
        preferences.put("global", "1", domain = "d", variant = "s1")
        preferences.put("global", "2", domain = "d", variant = "s2")

        preferences.delete("global", variant = "s1")

        assertNull(preferences.get("global", variant = "s1"))
        assertEquals("2", preferences.get("global", variant = "s2")?.value)
    }

    @Test
    fun `deleteDomain remove todas as entradas do dominio, preservando outros dominios`() = runTest {
        val preferences = Preferences(FakePreferenceDao())
        preferences.put("a", "1", domain = "chapterSortPrefs", variant = "s1")
        preferences.put("b", "2", domain = "chapterSortPrefs", variant = "s2")
        preferences.put("c", "3", domain = "libraryViewPrefs")

        preferences.deleteDomain("chapterSortPrefs")

        assertNull(preferences.get("a", variant = "s1"))
        assertNull(preferences.get("b", variant = "s2"))
        assertEquals("3", preferences.get("c")?.value)
    }
}
