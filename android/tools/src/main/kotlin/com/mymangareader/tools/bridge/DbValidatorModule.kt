package com.mymangareader.tools.bridge

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.mymangareader.core.database.DbStatusProvider
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DbValidatorModule @Inject constructor(
    private val dbStatus: DbStatusProvider,
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "DbValidator"

    @ReactMethod
    fun getDbStatus(promise: Promise) {
        runCatching {
            Arguments.createMap().apply {
                putInt("version", dbStatus.getVersion())
                putBoolean("isOpen", dbStatus.isOpen())
            }.also { promise.resolve(it) }
        }.onFailure { promise.reject("DB_ERROR", it.message, it) }
    }
}
