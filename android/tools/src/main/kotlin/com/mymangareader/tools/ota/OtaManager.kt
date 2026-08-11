package com.mymangareader.tools.ota

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.security.MessageDigest
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "OtaManager"
private val json = Json { ignoreUnknownKeys = true }
private const val RELEASE_PAGE_URL =
    "https://github.com/paulopotter/my-kavita-app-reader/releases/latest"

@Singleton
class OtaManager @Inject constructor(
    private val store: OtaStore,
    private val client: OkHttpClient,
    @OtaManifestUrl private val manifestUrl: String,
    @KotlinVersionName private val kotlinVersion: String,
    @CurrentAppVersion private val appVersion: String,
) {
    private val rnVersion: String
        get() = store.readState().currentBundleVersion.ifBlank { "" }
    private val _downloadProgress = MutableStateFlow(-1f)
    val downloadProgress: StateFlow<Float> = _downloadProgress.asStateFlow()

    // ── Boot lifecycle ─────────────────────────────────────────────────────────

    fun applyRollbackIfNeeded() {
        val state = store.readState()
        if (state.crashDetected && !state.isStable && store.prevBundleFile.exists()) {
            Log.w(TAG, "Crash detected — rolling back to previous bundle")
            store.prevBundleFile.copyTo(store.bundleFile, overwrite = true)
            store.writeState(OtaState())
        }
    }

    fun recordBootStart() {
        val state = store.readState()
        store.writeState(state.copy(bootCount = state.bootCount + 1, crashDetected = false))
        Log.d(TAG, "Boot start — bootCount=${state.bootCount + 1}")
    }

    fun recordStableBoot() {
        val state = store.readState()
        if (state.bootCount >= N_STABLE && !state.isStable) {
            store.writeState(state.copy(isStable = true))
            store.prevBundleFile.delete()
            Log.d(TAG, "Bundle marked stable after ${state.bootCount} boots")
        }
    }

    fun recordCrash() {
        val state = store.readState()
        if (!state.isStable) {
            store.writeState(state.copy(crashDetected = true))
            Log.e(TAG, "Crash recorded — will rollback on next boot")
        }
    }

    // ── OTA check and download ─────────────────────────────────────────────────

    suspend fun checkAndDownload(): OtaCheckResult = withContext(Dispatchers.IO) {
        runCatching {
            Log.d(TAG, "Checking OTA manifest: $manifestUrl")
            val manifest = fetchManifest() ?: return@withContext OtaCheckResult.Error(
                IllegalStateException("Failed to fetch manifest")
            )

            // Evaluate policies:
            //   required         → block app, no download
            //   highly_recommended → show popup, no download, app opens
            //   recommended      → show popup, download proceeds
            val policyResult = evaluatePolicies(manifest.policies)
            if (policyResult?.mode == "required" || policyResult?.mode == "highly_recommended") {
                Log.w(TAG, "Policy ${policyResult.mode} — skipping download")
                return@withContext policyResult
            }

            // Technical compatibility check (also blocking)
            if (!meetsMinKotlinVersion(kotlinVersion, manifest.minKotlinVersion)) {
                Log.w(TAG, "Kotlin $kotlinVersion < required ${manifest.minKotlinVersion}")
                return@withContext OtaCheckResult.PolicyMatch(
                    mode = "required",
                    releaseNotesUrl = RELEASE_PAGE_URL,
                )
            }

            // Check if bundle is already up to date
            val state = store.readState()
            if (manifest.lastRNVersion == state.currentBundleVersion) {
                Log.d(TAG, "Bundle already up to date: ${manifest.lastRNVersion}")
                return@withContext OtaCheckResult.UpToDate(policy = policyResult)
            }

            Log.d(TAG, "Downloading bundle ${manifest.lastRNVersion} from ${manifest.url}")
            val downloadResult = downloadAndValidate(manifest)

            // Attach non-blocking policy to the download result so splash shows both
            if (downloadResult is OtaCheckResult.Updated) {
                return@withContext downloadResult.copy(policy = policyResult)
            }
            downloadResult
        }.getOrElse { OtaCheckResult.Error(it) }
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private fun fetchManifest(): OtaManifest? = runCatching {
        val request = Request.Builder().url(manifestUrl).get().build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return null
            val body = response.body?.string() ?: return null
            json.decodeFromString<OtaManifest>(body)
        }
    }.getOrNull()

    private fun evaluatePolicies(policies: OtaPolicies?): OtaCheckResult.PolicyMatch? {
        if (policies == null) return null
        val levels = listOf(
            "required" to policies.required,
            "highly_recommended" to policies.highlyRecommended,
            "recommended" to policies.recommended,
        )
        for ((mode, entries) in levels) {
            for (entry in entries) {
                if (appliesToCurrentInstall(entry)) {
                    return OtaCheckResult.PolicyMatch(mode = mode, releaseNotesUrl = entry.releaseNotesUrl)
                }
            }
        }
        return null
    }

    private fun appliesToCurrentInstall(entry: OtaPolicyEntry): Boolean = when (entry.type) {
        "app" -> !meetsMinAppVersion(appVersion, entry.minVersion)
        "rn" -> !meetsMinRnVersion(rnVersion, entry.minVersion)
        "kotlin" -> !meetsMinKotlinVersion(kotlinVersion, entry.minVersion)
        else -> false
    }

    private fun downloadAndValidate(manifest: OtaManifest): OtaCheckResult {
        _downloadProgress.value = -1f
        val temp = store.tempBundleFile
        temp.delete()

        val request = Request.Builder().url(manifest.url).get().build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return OtaCheckResult.Error(
                IllegalStateException("Bundle download failed: HTTP ${response.code}")
            )
            val body = response.body ?: return OtaCheckResult.Error(
                IllegalStateException("Empty bundle response")
            )
            val contentLength = body.contentLength()
            var downloaded = 0L

            body.byteStream().use { input ->
                temp.outputStream().use { output ->
                    val buffer = ByteArray(8 * 1024)
                    var read: Int
                    while (input.read(buffer).also { read = it } != -1) {
                        output.write(buffer, 0, read)
                        downloaded += read
                        if (contentLength > 0) {
                            _downloadProgress.value = downloaded.toFloat() / contentLength
                        }
                    }
                }
            }
        }

        if (!verifyHash(temp, manifest.bundleHash)) {
            temp.delete()
            _downloadProgress.value = -1f
            Log.e(TAG, "Bundle hash mismatch — discarding download")
            return OtaCheckResult.Error(IllegalStateException("Bundle hash mismatch"))
        }

        // Rotate: current → prev, temp → current
        if (store.bundleFile.exists()) {
            store.bundleFile.copyTo(store.prevBundleFile, overwrite = true)
        }
        temp.copyTo(store.bundleFile, overwrite = true)
        temp.delete()

        val state = store.readState()
        val prevVersion = state.currentBundleVersion
        store.writeState(state.copy(currentBundleVersion = manifest.lastRNVersion, isStable = false, bootCount = 0))

        _downloadProgress.value = 1f
        Log.d(TAG, "Bundle updated to ${manifest.lastRNVersion}")
        return OtaCheckResult.Updated(prevVersion = prevVersion, newVersion = manifest.lastRNVersion, policy = null)
    }

    private fun verifyHash(file: File, expectedHash: String): Boolean = runCatching {
        // expectedHash format: "sha256:<hex>"
        val hex = expectedHash.removePrefix("sha256:")
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(8 * 1024)
            var read: Int
            while (input.read(buffer).also { read = it } != -1) {
                digest.update(buffer, 0, read)
            }
        }
        val actual = digest.digest().joinToString("") { "%02x".format(it) }
        actual == hex
    }.getOrDefault(false)
}
