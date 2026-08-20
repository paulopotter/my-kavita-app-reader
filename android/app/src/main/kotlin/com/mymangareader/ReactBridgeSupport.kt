package com.mymangareader

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

// Emits an RN device event, guarding against the two known-unsafe windows: no active React
// instance yet (this module can be Hilt-constructed before React is up, and emit() before that
// point crashes with IllegalStateException — see SeriesModule's original comment on this) and no
// JS event-emitter module registered yet. `params` accepts null for parameterless events (e.g.
// OtaEventBridge's otaBundleReady) alongside the usual WritableMap/WritableArray.
fun ReactApplicationContext.emitEvent(name: String, params: Any?) {
    if (!hasActiveReactInstance()) return
    getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)?.emit(name, params)
}

// Resolves/rejects a Promise from a suspend Result<T> — the same onSuccess/onFailure shape every
// @ReactMethod in this codebase already writes by hand. `errorCode` stays a required, per-call
// parameter (never a shared default) since every existing call site uses a code specific to that
// method (e.g. PAGE_URLS_ERROR, INVALIDATE_PAGE_CACHE_ERROR) — this helper only removes the
// repeated onSuccess/onFailure wiring, not the per-method error identity.
//
// For Result<Unit> call sites (the common "fire and resolve(null)" case), the default transform
// must map Unit to null explicitly — passing kotlin.Unit itself into promise.resolve() crashes
// the RN bridge (Arguments.fromJavaArgs has no conversion for Unit, confirmed on-device: "Cannot
// convert argument of type class kotlin.Unit" from CallbackImpl.invoke). Every call site that
// doesn't pass its own `transform` relies on this.
fun <T> Result<T>.resolveOrReject(promise: Promise, errorCode: String, transform: (T) -> Any? = { if (it == Unit) null else it }) {
    onSuccess { promise.resolve(transform(it)) }
        .onFailure { promise.reject(errorCode, it.message, it) }
}
