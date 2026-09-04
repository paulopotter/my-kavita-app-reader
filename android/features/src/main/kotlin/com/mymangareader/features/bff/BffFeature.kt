package com.mymangareader.features.bff

import com.mymangareader.core.database.BffServerConfigDao
import com.mymangareader.tools.network.RequestTool
import javax.inject.Inject
import javax.inject.Singleton

private const val BFF_HEALTH_CHECK_PATH = "/manga"

// Task 028: syncBff()/MangaDto/BffMatch writing were removed — the BFF match refresh now happens
// on the RN side (SerialsService.externalDetails.sync → ExternalMetadataServer), not through this
// feature. What's left backs SetupModule only (config-screen connection test + last-known URL).
@Singleton
class BffFeature
    @Inject
    constructor(
        private val requestTool: RequestTool,
        private val bffServerConfigDao: BffServerConfigDao,
    ) {
        @Volatile private var lastKnownUrl: String? = null

        fun getLastKnownUrl(): String? = lastKnownUrl

        suspend fun testConnection(): Result<String> =
            runCatching {
                resolveActiveUrl() ?: error("No BFF server available")
            }

        private suspend fun resolveActiveUrl(): String? {
            val bffCandidates = bffServerConfigDao.getAll()
            if (bffCandidates.isEmpty()) return null

            for (candidate in bffCandidates) {
                val url = candidate.url.trimEnd('/')
                val path = candidate.healthCheckPath.ifBlank { BFF_HEALTH_CHECK_PATH }

                val ok =
                    runCatching {
                        requestTool
                            .request(
                                url = "$url$path",
                                method = "GET",
                            ).getOrNull()
                            ?.status == 200
                    }.getOrElse { false }

                if (ok) {
                    lastKnownUrl = url
                    return url
                }
            }

            return null
        }
    }
