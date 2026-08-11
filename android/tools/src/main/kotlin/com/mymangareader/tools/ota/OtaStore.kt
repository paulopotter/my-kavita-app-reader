package com.mymangareader.tools.ota

import kotlinx.serialization.json.Json
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

private val json = Json { ignoreUnknownKeys = true }

// filesDir is injected by OtaModule via @OtaFilesDir qualifier.
// In tests, construct directly with any File as filesDir.
@Singleton
class OtaStore @Inject constructor(@OtaFilesDir filesDir: File) {

    private val otaDir = File(filesDir, "ota").also { it.mkdirs() }

    val bundleFile: File get() = File(otaDir, "bundle.js")
    val prevBundleFile: File get() = File(otaDir, "bundle.prev.js")
    val tempBundleFile: File get() = File(otaDir, "bundle.tmp.js")

    private val metaFile: File get() = File(otaDir, "meta.json")

    fun readState(): OtaState = runCatching {
        json.decodeFromString<OtaState>(metaFile.readText())
    }.getOrDefault(OtaState())

    fun writeState(state: OtaState) {
        metaFile.writeText(json.encodeToString(OtaState.serializer(), state))
    }
}
