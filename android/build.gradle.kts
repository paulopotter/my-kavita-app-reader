plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
    alias(libs.plugins.kover)
}

// ── Kover — relatório consolidado de todos os módulos com testes ──────────────
kover {
    merge {
        subprojects {
            it.name in listOf("core", "tools", "features", "server", "content-digest", "cache", "preferences")
        }
    }
    reports {
        filters {
            excludes {
                // Room DAO implementations geradas pelo KSP
                classes(
                    "*.*_Impl",
                    "*.*_Impl\$*",
                    // Hilt/Dagger factories e injectors
                    "*.*_Factory",
                    "*.*_Factory\$*",
                    "*.*_MembersInjector",
                    "*.Dagger*",
                    "*.*Module_Provide*Factory",
                    "*.*Module_Provide*Factory\$*",
                    // Hilt aggregated deps (pacote raiz)
                    "hilt_aggregated_deps.*",
                    // BuildConfig gerado por AGP
                    "*.BuildConfig",
                    // Companion objects de DTOs internos (sem lógica testável)
                    "*.\$*\$Companion",
                )
            }
        }
        total {
            html { onCheck = false }
            xml  { onCheck = false }
            // COVERAGE_FLOOR_KOTLIN=77 — bump this value whenever coverage improves.
            // Bumped from 76: :cache and :preferences joined the merged subprojects list (they
            // already had — or, for :preferences, gained — full test coverage of their own but
            // were never included in this aggregate before), pushing the measured value to
            // ~77.92%. Floor set slightly below that to leave headroom.
            verify {
                rule("Kotlin line coverage floor") {
                    bound {
                        minValue = 77
                        coverageUnits = kotlinx.kover.gradle.plugin.dsl.CoverageUnit.LINE
                        aggregationForGroup = kotlinx.kover.gradle.plugin.dsl.AggregationType.COVERED_PERCENTAGE
                    }
                }
            }
        }
    }
}

// Third-party RN libs use safeExtGet() which reads from rootProject.ext.
// Without these, AGP 8.x rejects compileSdkVersion as an unknown DSL element.
ext.set("compileSdkVersion", 35)
ext.set("targetSdkVersion", 35)
ext.set("minSdkVersion", 26)
