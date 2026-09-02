package com.mymangareader.features.startup

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

// Task 028: SplashSyncCoordinator no longer does any work — series listing / BFF sync moved to
// RN, the chapterCacheDao warm-up loop is gone. sync() is a no-op kept only so StartupModule's
// bridge methods still resolve. These tests pin that contract.
class SplashSyncCoordinatorTest {

    @Test
    fun `progress starts at 0 before sync`() = runTest {
        assertEquals(0f, SplashSyncCoordinator().progress.value)
    }

    @Test
    fun `sync returns true and drives progress to 1 without doing any work`() = runTest {
        val coordinator = SplashSyncCoordinator()
        val result = coordinator.sync()
        assertTrue(result)
        assertEquals(1f, coordinator.progress.value)
    }
}
