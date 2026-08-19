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
            it.name in listOf("core", "tools", "features")
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
            // COVERAGE_FLOOR_KOTLIN=57 — bump this value whenever coverage improves (never lower it).
            // Was 49 as of 2026-08-14. Reader tap-to-toggle overlay work (detectTapGestures in
            // ReaderPageList.kt, onTap plumbing in ReaderPageListView/ReaderPageListViewManager)
            // — real measured value is ~58.37%.
            verify {
                rule("Kotlin line coverage floor") {
                    bound {
                        minValue = 57
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
