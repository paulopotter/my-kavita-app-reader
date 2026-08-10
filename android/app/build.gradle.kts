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
    hermesCommand = "../../frontend/node_modules/react-native/sdks/hermesc/osx-bin/hermesc"
}

android {
    namespace = "com.mymangareader"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.mymangareader"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
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

    // React Native
    implementation("com.facebook.react:react-android:${libs.versions.reactNative.get()}")
    implementation("com.facebook.react:hermes-android:${libs.versions.reactNative.get()}")
}
