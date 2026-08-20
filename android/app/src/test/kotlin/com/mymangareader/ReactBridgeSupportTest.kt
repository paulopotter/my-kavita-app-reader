package com.mymangareader

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ReactBridgeSupportTest {

    // Regressão: Result<Unit>.resolveOrReject(promise, code) sem transform explícito costumava
    // repassar o kotlin.Unit em si para promise.resolve() — o bridge do RN (Arguments.fromJavaArgs)
    // não sabe converter Unit e derrubava o app com "Cannot convert argument of type class
    // kotlin.Unit" (confirmado on-device, reader-log). O default transform precisa mapear Unit
    // para null, igual ao promise.resolve(null) que todo @ReactMethod escrevia manualmente antes
    // desta função existir.
    @Test
    fun `resolveOrReject com Result de Unit resolve com null, nunca com Unit`() {
        val promise = FakePromise()

        Result.success(Unit).resolveOrReject(promise, "SOME_ERROR")
        promise.awaitResolved()

        assertNull(promise.resolvedValue)
        assertNull(promise.rejectedCode)
    }

    @Test
    fun `resolveOrReject com Result de Boolean preserva o valor`() {
        val promise = FakePromise()

        Result.success(true).resolveOrReject(promise, "SOME_ERROR")
        promise.awaitResolved()

        assertEquals(true, promise.resolvedValue)
    }

    @Test
    fun `resolveOrReject com falha rejeita com o codigo informado`() {
        val promise = FakePromise()

        Result.failure<Unit>(IllegalStateException("boom")).resolveOrReject(promise, "SOME_ERROR")
        promise.awaitResolved()

        assertEquals("SOME_ERROR", promise.rejectedCode)
    }

    @Test
    fun `resolveOrReject com transform explicito usa o valor transformado`() {
        val promise = FakePromise()

        Result.success(5).resolveOrReject(promise, "SOME_ERROR") { it * 2 }
        promise.awaitResolved()

        assertEquals(10, promise.resolvedValue)
    }
}
