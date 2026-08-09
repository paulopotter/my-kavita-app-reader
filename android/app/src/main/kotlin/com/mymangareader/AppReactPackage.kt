package com.mymangareader

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.mymangareader.core.database.DbStatusProvider
import com.mymangareader.tools.bridge.ConfigRepository
import com.mymangareader.tools.bridge.ConfigStore
import com.mymangareader.tools.bridge.DbValidatorModule

class AppReactPackage(
    private val configStore: ConfigStore,
    private val dbStatus: DbStatusProvider,
) : ReactPackage {

    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
        listOf(
            ConfigRepository(configStore, context),
            DbValidatorModule(dbStatus, context),
        )

    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
