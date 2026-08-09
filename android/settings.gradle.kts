pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

// react.settings plugin and ReactSettingsExtension will be configured
// once frontend/node_modules exists (task 009 — frontend setup)

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://www.jitpack.io") }
    }
}

rootProject.name = "mymangareader"

include(":app")
include(":core")
include(":tools")
include(":features")
