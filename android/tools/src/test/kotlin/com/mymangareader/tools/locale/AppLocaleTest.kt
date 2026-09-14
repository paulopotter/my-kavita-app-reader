package com.mymangareader.tools.locale

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// Same runner/SDK level as ConfigRepositoryRobolectricTest — LocaleManager (API 33+) needs a real
// Android runtime to resolve at all, even the no-override case.
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class AppLocaleTest {
    private val context = ApplicationProvider.getApplicationContext<Application>()

    @Test
    fun `resolveTag sempre retorna pt-BR ou en, nunca lanca`() {
        val tag = AppLocale.resolveTag(context)

        assertTrue(tag == "pt-BR" || tag == "en")
    }

    @Test
    fun `contextFor retorna um Context cujas resources refletem o tag resolvido`() {
        val resolved = AppLocale.resolveTag(context)

        val localized = AppLocale.contextFor(context)

        val effectiveLanguage = localized.resources.configuration.locales[0].language
        val expectedLanguage = if (resolved == "pt-BR") "pt" else "en"
        assertEquals(expectedLanguage, effectiveLanguage)
    }

    @Test
    fun `contextFor nunca retorna o mesmo Context passado (sempre um novo com config aplicada)`() {
        val localized = AppLocale.contextFor(context)

        assertTrue(localized !== context)
    }
}
