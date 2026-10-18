package com.mymangareader

import com.mymangareader.features.kavita.ActiveUrlSource
import com.mymangareader.server.Server
import javax.inject.Inject
import javax.inject.Singleton

/**
 * The URL the active server group answers on, as the :server module sees it — the group the app
 * actually reads content from and the server screen edits. The active-URL watcher used to ask the
 * legacy `server_config` table instead, which nothing writes any more: it kept probing the address
 * the server had before the last change.
 */
@Singleton
class ServerActiveUrlSource
    @Inject
    constructor(
        private val server: Server,
    ) : ActiveUrlSource {
        override suspend fun getActiveUrl(): Result<String> = server.resolveActiveUrl()
    }
