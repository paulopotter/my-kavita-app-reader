package com.mymangareader.features

import com.mymangareader.features.kavita.KavitaUrlSelector
import com.mymangareader.features.kavita.KavitaUrlSource
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class FeaturesModule {

    @Binds
    @Singleton
    abstract fun bindKavitaUrlSource(impl: KavitaUrlSelector): KavitaUrlSource
}
