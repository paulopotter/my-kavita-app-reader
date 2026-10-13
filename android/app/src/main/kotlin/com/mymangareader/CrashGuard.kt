package com.mymangareader

import com.mymangareader.tools.diagnostics.DiagnosticLog
import com.mymangareader.tools.ota.OtaManager
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CrashGuard
    @Inject
    constructor(
        private val otaManager: OtaManager,
    ) {
        fun install() {
            val previous = Thread.getDefaultUncaughtExceptionHandler()
            Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
                // First, and guarded: the file is the one record of a crash that happens with nobody
                // watching logcat, and it must never get in the way of the OTA bookkeeping below.
                runCatching { DiagnosticLog.crash(thread, throwable) }
                otaManager.recordCrash()
                previous?.uncaughtException(thread, throwable)
            }
        }
    }
