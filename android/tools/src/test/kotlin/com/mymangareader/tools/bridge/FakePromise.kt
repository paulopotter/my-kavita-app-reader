package com.mymangareader.tools.bridge

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/** Promise fake que permite aguardar (sincronamente, em testes JVM) a resolução disparada por scope.launch(Dispatchers.IO). */
class FakePromise : Promise {
    private val latch = CountDownLatch(1)
    var resolvedValue: Any? = null
        private set
    var rejectedCode: String? = null
        private set

    override fun resolve(value: Any?) {
        resolvedValue = value
        latch.countDown()
    }

    private fun markRejected(code: String?) {
        rejectedCode = code ?: "ERROR"
        latch.countDown()
    }

    override fun reject(code: String?, message: String?) = markRejected(code)
    override fun reject(code: String?, throwable: Throwable?) = markRejected(code)
    override fun reject(code: String?, message: String?, throwable: Throwable?) = markRejected(code)
    override fun reject(throwable: Throwable?) = markRejected(null)
    override fun reject(throwable: Throwable?, userInfo: WritableMap?) = markRejected(null)
    override fun reject(code: String?, userInfo: WritableMap) = markRejected(code)
    override fun reject(code: String?, throwable: Throwable?, userInfo: WritableMap?) = markRejected(code)
    override fun reject(code: String?, message: String?, userInfo: WritableMap) = markRejected(code)
    override fun reject(code: String?, message: String?, throwable: Throwable?, userInfo: WritableMap?) = markRejected(code)
    override fun reject(message: String?) = markRejected("ERROR")

    fun awaitResolved() {
        check(latch.await(2, TimeUnit.SECONDS)) { "promise não resolveu a tempo" }
    }
}
