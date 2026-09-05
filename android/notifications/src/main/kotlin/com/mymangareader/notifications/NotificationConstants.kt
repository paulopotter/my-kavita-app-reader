package com.mymangareader.notifications

// ntfy's own documented liveness endpoint — used as every candidate's healthCheckPath so
// UrlSelector (built for a bare "GET <url><healthCheckPath>" check) works unmodified for this
// provider too, same as it already does for :server/:external-metadata-server. Shared between
// NotificationGroupResolver (picks the active URL to connect to) and Notifications.group(id)
// .testUrl (the config screen's per-URL "test connection" button).
const val NTFY_HEALTH_CHECK_PATH = "/v1/health"
