package com.mymangareader.tools.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

// A point-in-time "is there any usable network right now" check — airplane mode, no SIM/Wi-Fi at
// all, etc. Deliberately NOT "is the internet actually reachable" (that's what a health-check
// probe, e.g. ActiveUrlSelector, is for) — this only exists to skip a doomed health-check attempt
// before it happens (NotificationConnectionService's own retry loop), not to replace one.
interface NetworkAvailability {
    fun isConnected(): Boolean
}

@Singleton
class AndroidNetworkAvailability
    @Inject
    constructor(
        @ApplicationContext private val context: Context,
    ) : NetworkAvailability {
        override fun isConnected(): Boolean {
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
            val network = connectivityManager.activeNetwork ?: return false
            val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
            return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        }
    }
