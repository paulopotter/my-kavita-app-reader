package com.mymangareader.core.database

import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RoomDbStatusProvider @Inject constructor(private val db: AppDatabase) : DbStatusProvider {
    override fun getVersion(): Int = db.openHelper.readableDatabase.version
    override fun isOpen(): Boolean = db.isOpen
}

@Module
@InstallIn(SingletonComponent::class)
abstract class DbStatusModule {
    @Binds
    abstract fun bindDbStatus(impl: RoomDbStatusProvider): DbStatusProvider
}
