package com.mymangareader.tools.ota

import android.content.Context
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import java.io.File
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object OtaModule {

    @Provides
    @Singleton
    @OtaFilesDir
    fun provideOtaFilesDir(@ApplicationContext context: Context): File = context.filesDir
}
