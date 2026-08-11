import java.util.Properties
import java.util.TimeZone
import java.text.SimpleDateFormat
import java.util.Date

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
    id("com.facebook.react")
}

react {
    root = file("../../frontend")
    reactNativeDir = file("../../frontend/node_modules/react-native")
    codegenDir = file("../../frontend/node_modules/@react-native/codegen")
    cliFile = file("../../frontend/node_modules/.bin/react-native")
    bundleAssetName = "index.android.bundle"
    entryFile = file("../../frontend/index.tsx")
    bundleCommand = "bundle"
    // hermesCommand omitted — RN plugin auto-detects the correct binary for the current OS
}

// OTA manifest URL — priority: local.properties > CI env var > default GitHub
val localProps = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) load(f.inputStream())
}
val otaManifestUrl: String =
    localProps.getProperty("OTA_MANIFEST_URL")
        ?: System.getenv("OTA_MANIFEST_URL")
        ?: "https://github.com/paulopotter/my-kavita-app-reader/releases/latest/download/latest.json"

// RN version read from frontend/package.json at build time
val rnVersion: String = runCatching {
    val pkgJson = rootProject.file("../frontend/package.json")
    val versionLine = pkgJson.readLines().first { it.trimStart().startsWith("\"version\"") }
    versionLine.trim().removePrefix("\"version\":").trim().trim('"', ',', ' ')
}.getOrDefault("0.0.0")

// App datetime tag generated at build time (YYYY.MM.DD.HHMM, UTC)
val appBuildDatetime: String = SimpleDateFormat("yyyy.MM.dd.HHmm").apply {
    timeZone = TimeZone.getTimeZone("UTC")
}.format(Date())

// versionCode derived from git commit count — always grows, never hardcoded
val gitCommitCount: Int = runCatching {
    val process = ProcessBuilder("git", "rev-list", "--count", "HEAD")
        .directory(rootProject.projectDir)
        .start()
    process.inputStream.bufferedReader().readText().trim().toInt()
}.getOrDefault(1)

android {
    namespace = "com.mymangareader"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.mymangareader"
        minSdk = 26
        targetSdk = 35
        versionCode = gitCommitCount
        versionName = "0.4.0"

        buildConfigField("String", "OTA_MANIFEST_URL", "\"$otaManifestUrl\"")
        buildConfigField("String", "KOTLIN_VERSION_NAME", "\"$versionName\"")
        buildConfigField("String", "RN_VERSION", "\"$rnVersion\"")
        buildConfigField("String", "APP_BUILD_DATETIME", "\"$appBuildDatetime\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation(project(":core"))
    implementation(project(":tools"))
    implementation(project(":features"))

    implementation(libs.androidx.core.ktx)
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.androidx.appcompat)

    // React Native
    implementation("com.facebook.react:react-android:${libs.versions.reactNative.get()}")
    implementation("com.facebook.react:hermes-android:${libs.versions.reactNative.get()}")
}
