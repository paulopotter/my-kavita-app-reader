plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.kover)
}

android {
    namespace = "com.mymangareader.externalmetadataserver"
    compileSdk = 35

    defaultConfig {
        minSdk = 26
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation(project(":core"))
    implementation(project(":tools"))
    // Same-layer composition (R1) — Server and ExternalMetadataServer are both Layer 2.
    // syncMatchByServerId/syncMatchByServerUrl take a Server instance by parameter (never stored,
    // never Hilt-injected into this module's own constructor) to resolve which BFF group is
    // linked to a given Kavita server group/url — see _contract-design-notes.md § Task 022.
    implementation(project(":server"))

    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.okhttp.mockwebserver)
    testImplementation(libs.kotlin.test)
}
