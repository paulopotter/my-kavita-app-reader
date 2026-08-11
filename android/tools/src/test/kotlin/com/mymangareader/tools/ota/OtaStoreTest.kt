package com.mymangareader.tools.ota

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class OtaStoreTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    private lateinit var filesDir: File
    private lateinit var store: OtaStore

    @Before
    fun setUp() {
        filesDir = tempFolder.newFolder("files")
        // OtaStore receives a File via @OtaFilesDir; in tests we pass it directly.
        store = OtaStore(filesDir)
    }

    @Test
    fun `readState returns default when meta file is absent`() {
        val state = store.readState()
        assertEquals("", state.currentBundleVersion)
        assertEquals(0, state.bootCount)
        assertFalse(state.isStable)
        assertFalse(state.crashDetected)
    }

    @Test
    fun `writeState and readState round-trip`() {
        val original = OtaState(
            currentBundleVersion = "1.2.3",
            bootCount = 5,
            isStable = true,
            crashDetected = false,
        )
        store.writeState(original)
        val recovered = store.readState()
        assertEquals(original, recovered)
    }

    @Test
    fun `bundleFile path is inside ota directory`() {
        assertTrue(store.bundleFile.absolutePath.contains("ota"))
        assertEquals("bundle.js", store.bundleFile.name)
    }

    @Test
    fun `prevBundleFile path is inside ota directory`() {
        assertEquals("bundle.prev.js", store.prevBundleFile.name)
    }

    @Test
    fun `readState tolerates malformed json`() {
        val otaDir = File(filesDir, "ota").also { it.mkdirs() }
        File(otaDir, "meta.json").writeText("not-valid-json{{{")
        val state = store.readState()
        assertEquals(OtaState(), state)
    }

    @Test
    fun `writeState overwrites previous state`() {
        store.writeState(OtaState(bootCount = 1))
        store.writeState(OtaState(bootCount = 7, isStable = true))
        assertEquals(7, store.readState().bootCount)
        assertTrue(store.readState().isStable)
    }
}
