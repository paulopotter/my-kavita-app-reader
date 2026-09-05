plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
    alias(libs.plugins.kover)
    alias(libs.plugins.ktlint) apply false
}

// ── ktlint — our own modules only. `subprojects` also picks up the RN autolinked libraries
// under frontend/node_modules/ (react-native-screens, react-native-safe-area-context, ...) —
// third-party code we don't own and shouldn't reformat or lint.
val ktlintModules = listOf("app", "core", "tools", "features", "server", "content-digest", "cache", "preferences", "external-metadata-server", "notifications")
subprojects {
    if (name in ktlintModules) {
        apply(plugin = "org.jlleitschuh.gradle.ktlint")
        configure<org.jlleitschuh.gradle.ktlint.KtlintExtension> {
            version.set("1.3.1")
        }
    }
}

// ── Kover — relatório consolidado de todos os módulos com testes ──────────────
kover {
    merge {
        subprojects {
            it.name in listOf("core", "tools", "features", "server", "content-digest", "cache", "preferences", "notifications")
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
            // COVERAGE_FLOOR_KOTLIN=84 — bump this value whenever coverage improves.
            // Bumped from 78 (Task 028): deleting the untested LibraryModule, KavitaSeriesFeature.
            // listSeries()/resolveProgress(), BffFeature.syncBff() and the SplashSyncCoordinator
            // work loop removed a large block of uncovered lines, lifting the measured value to
            // ~81.18%.
            // Bumped from 81 (Task 038): deleting the rest of SplashSyncCoordinator + StartupModule's
            // sync methods, and adding OtaManager.check() with full branch coverage, lifted it to
            // ~83.16%.
            // Bumped from 83 (Plan 008 Task 001): new :notifications module (schema + thin CRUD
            // facade) added to the merged Kover report with full DAO/migration/facade test
            // coverage, lifting the measured value to ~84.37%.
            verify {
                rule("Kotlin line coverage floor") {
                    bound {
                        minValue = 84
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
