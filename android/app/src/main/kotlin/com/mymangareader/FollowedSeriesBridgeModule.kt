package com.mymangareader

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.mymangareader.core.database.FollowedSeriesDao
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

// RN→Kotlin bridge for FollowedSeriesDao (:core, Room) — "series follow" is 100% local today (no
// Kavita server round trip; see FollowedSeriesDao's own SQL). A separate module from SeriesModule
// on purpose: SeriesModule mixes several unrelated concerns (chapter cache, sort prefs, follow),
// this one only exposes the follow DAO, for the new series.tool (RN) to depend on directly instead
// of the whole legacy SeriesModule surface. Known limitation, deliberately not solved here: this
// stays a plain local toggle until a richer "followed series" design (possibly synced with the
// server) replaces it — that future work only touches serie.tool (RN) plus whatever new bridge it
// needs, not any of this module's callers.
@Singleton
class FollowedSeriesBridgeModule
    @Inject
    constructor(
        private val followedSeriesDao: FollowedSeriesDao,
        context: ReactApplicationContext,
    ) : ReactContextBaseJavaModule(context) {
        override fun getName(): String = "FollowedSeriesBridgeModule"

        private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

        @ReactMethod
        fun toggle(
            seriesId: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching { followedSeriesDao.toggle(seriesId) }.resolveOrReject(promise, "FOLLOWED_SERIES_TOGGLE_ERROR")
            }
        }

        @ReactMethod
        fun isFollowed(
            seriesId: String,
            promise: Promise,
        ) {
            scope.launch {
                runCatching { followedSeriesDao.isFollowed(seriesId) }.resolveOrReject(promise, "FOLLOWED_SERIES_IS_FOLLOWED_ERROR")
            }
        }

        @ReactMethod
        fun getAllIds(promise: Promise) {
            scope.launch {
                runCatching { followedSeriesDao.getAllIds() }
                    .resolveOrReject(promise, "FOLLOWED_SERIES_GET_ALL_IDS_ERROR") { ids ->
                        // promise.resolve() only converts WritableArray, not a raw Array<String>
                        // (Arguments.fromJavaArgs: "Cannot convert argument of type class
                        // [Ljava.lang.String;") — build a WritableArray explicitly.
                        Arguments.createArray().also { arr -> ids.forEach { arr.pushString(it) } }
                    }
            }
        }
    }
