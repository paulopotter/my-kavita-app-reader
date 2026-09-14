package com.mymangareader.tools.locale

import android.app.LocaleManager
import android.content.Context
import android.os.Build
import java.util.Locale

/**
 * Resolves the app's effective language — the per-app override the user set (in-app or under
 * Settings > System > Languages > App languages, API 33+ via [LocaleManager]), or, when none is
 * set, the device's own locale. Always one of the app's two supported tags ("pt-BR" / "en"),
 * matching `getAppLocale()`'s own contract on the RN bridge (`ConfigRepository`, which now just
 * delegates here) — this is the same source of truth, extracted so any native-only code path (a
 * background Service building a system-tray notification, which has no JS/RN context to ask) can
 * resolve it without going through the bridge.
 *
 * Below API 33 there's no system-level per-app language override to read, so this falls back to
 * the JVM default [Locale] — same fallback [com.mymangareader.tools.bridge.ConfigRepository]
 * already used before this was extracted.
 */
object AppLocale {
    fun resolveTag(context: Context): String {
        val override =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.getSystemService(LocaleManager::class.java)?.applicationLocales
            } else {
                null
            }
        val tag =
            when {
                override != null && !override.isEmpty -> override[0].toLanguageTag()
                else -> Locale.getDefault().toLanguageTag()
            }
        return if (tag.startsWith("pt", ignoreCase = true)) "pt-BR" else "en"
    }

    // A Context whose resources resolve strings in the app's effective language — for any code
    // path that builds user-facing text outside of RN's own JS-driven UI (e.g. a native
    // notification), so it never silently follows the OS system locale instead of the app's own
    // per-app override.
    fun contextFor(context: Context): Context {
        val locale = Locale.forLanguageTag(resolveTag(context))
        val config = android.content.res.Configuration(context.resources.configuration)
        config.setLocale(locale)
        return context.createConfigurationContext(config)
    }
}
