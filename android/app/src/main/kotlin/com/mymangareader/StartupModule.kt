package com.mymangareader

import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.mymangareader.core.database.FollowedSeriesDao
import com.mymangareader.core.database.ServerConfigDao
import com.mymangareader.features.startup.SplashSyncCoordinator
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

private const val PREFS_NAME = "app_lifecycle"
private const val KEY_LAST_STOPPED_AT_MS = "last_stopped_at_ms"
private const val KEY_WAS_ON_ROOT_ROUTE = "was_on_root_route"
private const val KEY_LAST_ROUTE = "last_route"
private const val KEY_LAST_ROOT_ROUTE = "last_root_route"
private const val RECENT_WINDOW_MS = 5 * 60 * 1000L

// True only after notifyRouteChanged fires in this process lifetime.
// Starts false on every new process — force-stop resets it because the OS kills the process.
// Set to true the first time the app successfully navigates (not on module init),
// so getRestoredRoute returns null on a fresh boot even if prefs have a saved route.
private object ProcessLifecycleMarker {
    var isAlive = false
}

@Singleton
class StartupModule @Inject constructor(
    private val serverConfigDao: ServerConfigDao,
    private val followedSeriesDao: FollowedSeriesDao,
    private val splashSyncCoordinator: SplashSyncCoordinator,
    context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

    override fun getName(): String = "StartupModule"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    @ReactMethod
    fun hasServerConfigured(promise: Promise) {
        scope.launch {
            runCatching { serverConfigDao.getAll().isNotEmpty() }
                .onSuccess { promise.resolve(it) }
                .onFailure { promise.reject("STARTUP_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun hasFollowedSeries(promise: Promise) {
        scope.launch {
            runCatching { followedSeriesDao.getAllIds().isNotEmpty() }
                .onSuccess { promise.resolve(it) }
                .onFailure { promise.reject("STARTUP_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun syncBlocking(promise: Promise) {
        scope.launch {
            runCatching { splashSyncCoordinator.sync() }
                .onSuccess { success ->
                    Arguments.createMap().apply {
                        putBoolean("success", success)
                    }.let { promise.resolve(it) }
                }
                .onFailure { promise.reject("SYNC_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun syncInBackground(promise: Promise) {
        scope.launch { runCatching { splashSyncCoordinator.sync() } }
        promise.resolve(null)
    }

    @ReactMethod
    fun drainSyncQueue(promise: Promise) {
        // Stub — fila resiliente será implementada em plano futuro
        promise.resolve(null)
    }

    @ReactMethod
    fun isSeriesFollowed(seriesId: String, promise: Promise) {
        scope.launch {
            runCatching { followedSeriesDao.isFollowed(seriesId) }
                .onSuccess { promise.resolve(it) }
                .onFailure { promise.reject("STARTUP_ERROR", it.message, it) }
        }
    }

    @ReactMethod
    fun getRestoredRoute(promise: Promise) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        if (!ProcessLifecycleMarker.isAlive) {
            promise.resolve(null)
            return
        }

        val wasOnRootRoute = prefs.getBoolean(KEY_WAS_ON_ROOT_ROUTE, true)

        if (!wasOnRootRoute) {
            // Deep route (série/leitor) — always restore
            val lastRoute = prefs.getString(KEY_LAST_ROUTE, null)
            promise.resolve(lastRoute)
            return
        }

        // Root tab — only restore if within 5 minutes
        val lastStoppedAt = prefs.getLong(KEY_LAST_STOPPED_AT_MS, -1L)
        if (lastStoppedAt < 0) {
            promise.resolve(null)
            return
        }
        val withinWindow = (System.currentTimeMillis() - lastStoppedAt) < RECENT_WINDOW_MS
        if (withinWindow) {
            val lastRootRoute = prefs.getString(KEY_LAST_ROOT_ROUTE, null)
            promise.resolve(lastRootRoute)
        } else {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun notifyRouteChanged(route: String, isRootRoute: Boolean, rootRoute: String?, promise: Promise) {
        // Mark the process as alive the first time the app navigates to any screen.
        // This is the signal that distinguishes a running session from a fresh boot.
        ProcessLifecycleMarker.isAlive = true

        val context = reactApplicationContext
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_WAS_ON_ROOT_ROUTE, isRootRoute)
            .apply {
                if (!isRootRoute) putString(KEY_LAST_ROUTE, route) else remove(KEY_LAST_ROUTE)
                if (isRootRoute && rootRoute != null) putString(KEY_LAST_ROOT_ROUTE, rootRoute)
            }
            .apply()
        promise.resolve(null)
    }
}
