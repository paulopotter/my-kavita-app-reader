package com.mymangareader

import androidx.lifecycle.LifecycleOwner
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.kotlin.mock

class AppForegroundStateTest {
    private val owner: LifecycleOwner = mock()

    @Test
    fun `isForeground fica true apos onStart`() {
        AppForegroundState.observer.onStart(owner)

        assertTrue(AppForegroundState.isForeground.value)
    }

    @Test
    fun `isForeground fica false apos onStop`() {
        AppForegroundState.observer.onStart(owner)
        AppForegroundState.observer.onStop(owner)

        assertFalse(AppForegroundState.isForeground.value)
    }
}
