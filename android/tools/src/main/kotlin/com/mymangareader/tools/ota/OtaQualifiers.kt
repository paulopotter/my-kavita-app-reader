package com.mymangareader.tools.ota

import javax.inject.Qualifier

@Qualifier @Retention(AnnotationRetention.BINARY) annotation class OtaManifestUrl
@Qualifier @Retention(AnnotationRetention.BINARY) annotation class KotlinVersionName
@Qualifier @Retention(AnnotationRetention.BINARY) annotation class CurrentRnVersion
@Qualifier @Retention(AnnotationRetention.BINARY) annotation class CurrentAppVersion
@Qualifier @Retention(AnnotationRetention.BINARY) annotation class OtaFilesDir
