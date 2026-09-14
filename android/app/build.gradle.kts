import java.text.SimpleDateFormat
import java.util.Date
import java.util.Properties
import java.util.TimeZone

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
    alias(libs.plugins.kotlin.compose)
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
val localProps =
    Properties().apply {
        val f = rootProject.file("local.properties")
        if (f.exists()) load(f.inputStream())
    }
val otaManifestUrl: String =
    localProps.getProperty("OTA_MANIFEST_URL")
        ?: System.getenv("OTA_MANIFEST_URL")
        ?: "https://github.com/paulopotter/my-kavita-app-reader/releases/latest/download/latest.json"

// How close together (ms) two notification-history rows for the same serial need to have arrived
// to be visually collapsed into one entry when collapseSerialChaptersNotification is on (RN,
// config/notifications) — priority: local.properties > CI env var > default (15 minutes). Never
// affects storage (NotificationHistoryEntity always keeps every row separate) — presentation only.
val collapseWindowMs: Long =
    (
        localProps.getProperty("COLLAPSE_WINDOW_MS")
            ?: System.getenv("COLLAPSE_WINDOW_MS")
            ?: "900000"
    ).toLong()

// RN version read from frontend/package.json at build time
val rnVersion: String =
    runCatching {
        val pkgJson = rootProject.file("../frontend/package.json")
        val versionLine = pkgJson.readLines().first { it.trimStart().startsWith("\"version\"") }
        versionLine
            .trim()
            .removePrefix("\"version\":")
            .trim()
            .trim('"', ',', ' ')
    }.getOrDefault("0.0.0")

// App datetime tag generated at build time (YYYY.MM.DD.HHMM, UTC)
val appBuildDatetime: String =
    SimpleDateFormat("yyyy.MM.dd.HHmm")
        .apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date())

// Embedded RN bundle build timestamp (epoch millis), written by `make build-bundle` right after
// `yarn bundle:android` generates the JS bundle. Falls back to "now" when missing (e.g. a Gradle
// build run without going through build-bundle first) so the field is always a valid, safe-to-use
// timestamp rather than 0. Used to detect a stale OTA bundle (saved in app-private storage,
// survives reinstalls) that predates the currently packaged one — see OtaManager.discardStaleBundleIfNeeded.
val embeddedBundleBuildTimeMs: Long =
    runCatching {
        rootProject
            .file("app/bundle-build-time.txt")
            .readText()
            .trim()
            .toLong()
    }.getOrDefault(Date().time)

// versionCode derived from git commit count — always grows, never hardcoded
val gitCommitCount: Int =
    runCatching {
        val process =
            ProcessBuilder("git", "rev-list", "--count", "HEAD")
                .directory(rootProject.projectDir)
                .start()
        process.inputStream
            .bufferedReader()
            .readText()
            .trim()
            .toInt()
    }.getOrDefault(1)

android {
    namespace = "com.mymangareader"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.mymangareader"
        minSdk = 26
        targetSdk = 35
        versionCode = gitCommitCount
        versionName = "1.0.0-rc15"

        buildConfigField("String", "OTA_MANIFEST_URL", "\"$otaManifestUrl\"")
        buildConfigField("long", "COLLAPSE_WINDOW_MS", "${collapseWindowMs}L")
        buildConfigField("String", "KOTLIN_VERSION_NAME", "\"$versionName\"")
        buildConfigField("String", "RN_VERSION", "\"$rnVersion\"")
        buildConfigField("String", "APP_BUILD_DATETIME", "\"$appBuildDatetime\"")
        buildConfigField("long", "EMBEDDED_BUNDLE_BUILD_TIME_MS", "${embeddedBundleBuildTimeMs}L")
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
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
        compose = true
    }

    // Robolectric needs the real merged resources (strings.xml) to resolve Context.getString —
    // without this, R.string ids resolve fine at compile time but throw NotFoundException at
    // runtime under test (NotificationDisplayTest, Plan 008 Task 005).
    testOptions {
        unitTests.isIncludeAndroidResources = true
    }
}

// ── Deep link hosts (Plan 008 Task 004) ─────────────────────────────────────

fun readDeepLinkHostsFromLocalProperties(localPropertiesFile: File): List<String> {
    val properties = Properties()
    if (localPropertiesFile.exists()) {
        localPropertiesFile.inputStream().use { properties.load(it) }
    }
    return (1..5)
        .mapNotNull { index -> properties.getProperty("deeplink.host$index")?.trim() }
        .filter { it.isNotEmpty() }
}

// Strips a leading "http://"/"https://" (and a trailing "/") a host entry might still carry —
// env-to-local-properties.sh already does this on its own side, but local.properties can also be
// hand-edited directly, so this stays defensive here too rather than trusting that script ran.
// android:host/android:port manifest attributes never carry a scheme; without this, "https://
// host.com" makes substringBefore(':') below read "https" as the host and "//host.com" as the
// "port", which crashes the manifest parser at install time (not even at build time).
fun stripScheme(hostEntry: String): String =
    hostEntry
        .removePrefix("http://")
        .removePrefix("https://")
        .removeSuffix("/")

// The paths a link can arrive on. These are the CONTENT SERVER's own web URLs (what the user
// actually taps in a browser/Telegram), never this app's internal route names — Kavita serves a
// series both with and without the library segment, and a chapter under /manga/. Translating any
// of these into an internal route is DeepLinkNormalizer's job (`android/app/`), Kotlin-side only.
private val DEEP_LINK_PATH_PATTERNS =
    listOf(
        "/series/.*",
        "/series/.*/manga/.*",
        "/library/.*/series/.*",
        "/library/.*/series/.*/manga/.*",
    )

// Android App Links verification (the assetlinks.json handshake) only ever runs over https, and
// only when every <data> element in the SAME <intent-filter> the verification looks at carries
// android:autoVerify — so http and https can never share one filter here: http gets its own
// filter without autoVerify (works for plain http hosts/IPs, e.g. a local dev server, but never
// auto-verifies — Android doesn't verify App Links for bare IPs at all), https gets its own
// filter WITH autoVerify (only takes effect once https://<host>/.well-known/assetlinks.json
// exists and matches the app's signing cert, which a server-owned domain can't give us — see
// .claude/docs/quickstart.md § "Deep links". The filter still matches the link either way, just
// without the "opens with no prompt" guarantee autoVerify is meant to buy).
fun buildDeepLinkSchemeFilter(
    scheme: String,
    autoVerify: Boolean,
    hosts: List<String>,
): String {
    val dataElements = StringBuilder()
    for (rawHostEntry in hosts) {
        val hostEntry = stripScheme(rawHostEntry)
        val host = hostEntry.substringBefore(':')
        val port = hostEntry.substringAfter(':', missingDelimiterValue = "").ifEmpty { null }
        for (pathPattern in DEEP_LINK_PATH_PATTERNS) {
            dataElements.append("            <data\n")
            dataElements.append("                android:scheme=\"$scheme\"\n")
            dataElements.append("                android:host=\"$host\"\n")
            if (port != null) {
                dataElements.append("                android:port=\"$port\"\n")
            }
            dataElements.append("                android:pathPattern=\"$pathPattern\" />\n")
        }
    }

    val autoVerifyAttr = if (autoVerify) " android:autoVerify=\"true\"" else ""
    return "        <intent-filter$autoVerifyAttr>\n" +
        "            <action android:name=\"android.intent.action.VIEW\" />\n" +
        "            <category android:name=\"android.intent.category.DEFAULT\" />\n" +
        "            <category android:name=\"android.intent.category.BROWSABLE\" />\n" +
        dataElements.toString() +
        "        </intent-filter>\n"
}

fun buildDeepLinkHostsBlock(hosts: List<String>): String {
    if (hosts.isEmpty()) return ""

    return buildDeepLinkSchemeFilter("http", autoVerify = false, hosts) +
        buildDeepLinkSchemeFilter("https", autoVerify = true, hosts)
}

fun writeDeepLinkHostsBlock(
    manifestFile: File,
    hosts: List<String>,
) {
    val generatedBlock = buildDeepLinkHostsBlock(hosts)
    val manifestText = manifestFile.readText()
    val startMarker = "GENERATED_DEEP_LINK_HOSTS_START"
    val endMarker = "<!-- GENERATED_DEEP_LINK_HOSTS_END -->"
    val startIndex = manifestText.indexOf(startMarker)
    val endIndex = manifestText.indexOf(endMarker)
    check(startIndex != -1 && endIndex != -1) {
        "GENERATED_DEEP_LINK_HOSTS markers not found in $manifestFile"
    }

    // The generated block goes AFTER the instructional comment (which ends in "-->" after
    // startMarker) — only the region between that comment's end and the end marker is rewritten;
    // everything before/after stays exactly as it is in the file.
    val commentEndIndex = manifestText.indexOf("-->", startIndex) + "-->".length
    val before = manifestText.substring(0, commentEndIndex)
    val after = manifestText.substring(endIndex)
    val newManifestText = "$before\n$generatedBlock        $after"

    if (newManifestText != manifestText) {
        manifestFile.writeText(newManifestText)
    }
}

// Fills the http(s) deep link block from `deeplink.host1`..`deeplink.host5` in local.properties
// (a file outside version control — a user's personal server hosts never land in the repo).
// Runs before any build.
val generateDeepLinkHosts by tasks.registering {
    val manifestFile = file("src/main/AndroidManifest.xml")
    val localPropertiesFile = rootProject.file("local.properties")

    inputs.file(localPropertiesFile).optional()
    outputs.file(manifestFile)

    doLast {
        val hosts = readDeepLinkHostsFromLocalProperties(localPropertiesFile)
        writeDeepLinkHostsBlock(manifestFile, hosts)
        logger.lifecycle("AndroidManifest.xml updated with ${hosts.size} deep link host(s).")
    }
}

// Clears the http(s) deep link block back to empty after producing an APK — only this region of
// the manifest is touched, so any other manual edit to it stays intact. Keeps the committed
// manifest free of a user's personal hosts even after a local build with local.properties filled in.
val clearDeepLinkHosts by tasks.registering {
    val manifestFile = file("src/main/AndroidManifest.xml")

    doLast {
        writeDeepLinkHostsBlock(manifestFile, emptyList())
        logger.lifecycle("AndroidManifest.xml: deep link host block cleared post-build.")
    }
}

tasks.matching { it.name.startsWith("pre") && it.name.endsWith("Build") }.configureEach {
    dependsOn(generateDeepLinkHosts)
}

dependencies {
    implementation(project(":core"))
    implementation(project(":tools"))
    implementation(project(":features"))
    implementation(project(":server"))
    implementation(project(":content-digest"))
    implementation(project(":external-metadata-server"))
    implementation(project(":cache"))
    implementation(project(":preferences"))
    implementation(project(":notifications"))

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.core.splashscreen)
    implementation(libs.androidx.lifecycle.process)
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.recyclerview)
    implementation(libs.coil)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    debugImplementation(libs.androidx.compose.ui.tooling)

    // React Native
    implementation("com.facebook.react:react-android:${libs.versions.reactNative.get()}")
    implementation("com.facebook.react:hermes-android:${libs.versions.reactNative.get()}")

    // Third-party RN modules (autolinking generates PackageList but doesn't inject deps in this layout)
    implementation(project(":react-native-screens"))
    implementation(project(":react-native-safe-area-context"))
    implementation(project(":react-native-svg"))
    implementation(project(":react-native-community_netinfo"))
    implementation(project(":shopify_react-native-skia"))

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.mockito.kotlin)
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.test.core)
}
