package com.mymangareader

import com.mymangareader.tools.ota.OtaManager
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CrashGuard @Inject constructor(private val otaManager: OtaManager) {

    fun install() {
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            otaManager.recordCrash()
            previous?.uncaughtException(thread, throwable)
        }
    }
}
