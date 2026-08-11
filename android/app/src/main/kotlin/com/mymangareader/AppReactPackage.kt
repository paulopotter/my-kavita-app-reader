package com.mymangareader

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.mymangareader.core.database.DbStatusProvider
import com.mymangareader.tools.bridge.ConfigRepository
import com.mymangareader.tools.bridge.ConfigStore
import com.mymangareader.tools.bridge.DbValidatorModule
import com.mymangareader.tools.ota.OtaStore

class AppReactPackage(
    private val configStore: ConfigStore,
    private val dbStatus: DbStatusProvider,
    private val otaStore: OtaStore,
) : ReactPackage {

    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> {
        val otaBridge = OtaEventBridge(context, otaStore)
        OtaEventBridge.register(otaBridge)
        return listOf(
            ConfigRepository(configStore, context),
            DbValidatorModule(dbStatus, context),
            otaBridge,
        )
    }

    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
