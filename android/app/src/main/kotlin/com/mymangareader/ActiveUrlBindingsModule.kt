package com.mymangareader

import com.mymangareader.features.kavita.ActiveUrlSource
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class ActiveUrlBindingsModule {
    @Binds
    @Singleton
    abstract fun bindActiveUrlSource(impl: ServerActiveUrlSource): ActiveUrlSource
}
