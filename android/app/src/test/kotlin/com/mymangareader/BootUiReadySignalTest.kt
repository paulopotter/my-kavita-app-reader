package com.mymangareader

import org.junit.Assert.assertTrue
import org.junit.Test

// BootUiReadySignal is the "RN splash has painted" flag MainActivity waits on before releasing the
// system splash. Process-scoped, one-way (markReady only ever sets it true) — that's the contract.
class BootUiReadySignalTest {

    @Test
    fun `markReady flips ready to true and stays true`() {
        BootUiReadySignal.markReady()
        assertTrue(BootUiReadySignal.ready.value)
        BootUiReadySignal.markReady()
        assertTrue(BootUiReadySignal.ready.value)
    }
}
