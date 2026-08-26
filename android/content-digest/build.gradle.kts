plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.kover)
}

android {
    namespace = "com.mymangareader.contentdigest"
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
    implementation(project(":server"))
    implementation(project(":tools"))
    implementation(project(":cache"))
    // Same-layer composition (R1) — SeriesDigest (Layer 3) asks ExternalMetadataServer (Layer 2,
    // same layer as Server) for its part, per Task 028's decision for syncBff.
    implementation(project(":external-metadata-server"))

    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)

    testImplementation(project(":core"))
    testImplementation(project(":tools"))
    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.kotlin.test)
    testImplementation(libs.okhttp.core)
    testImplementation(libs.okhttp.mockwebserver)
}
