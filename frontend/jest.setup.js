/* eslint-disable no-undef */
/**
 * Global test bootstrap. Its one job: let the native-bridge modules
 * (src/shared/bridge/*, src/native/*) load in Jest WITHOUT crashing, so a test can
 * `jest.spyOn(SomeBridge, 'method')` on the real exported object instead of stubbing the whole
 * module path. Every bridge reads `NativeModules.XxxModule` at import time — and two of them
 * (`network.ts`, `series.ts`) build a `new NativeEventEmitter(...)` right there — so without
 * this, `import { ServerBridge } from '../../bridge'` (the barrel) would blow up on load.
 *
 * NOTE: this only makes the objects EXIST. Their methods are inert `jest.fn()`s; a test that
 * cares about a call must still spy/mock the specific method it exercises.
 */

const { NativeModules } = require('react-native');

// Every native module our bridges reference. A Proxy returns a fresh jest.fn() for any property
// read, so a bridge doing `NativeModules.ServerBridgeModule.listSerials` gets a callable.
const NATIVE_MODULE_NAMES = [
  'CacheBridgeModule',
  'ConfigRepository',
  'DbValidator',
  'DigestBridgeModule',
  'ExternalMetadataBridgeModule',
  'FollowedSeriesBridgeModule',
  'NetworkStatusModule',
  'OtaEventBridge',
  'PreferencesBridgeModule',
  'ReaderChapterModule',
  'ScreenControlModule',
  'SeriesModule',
  'ServerBridgeModule',
  'SetupModule',
  'StartupModule',
];

for (const name of NATIVE_MODULE_NAMES) {
  if (NativeModules[name]) continue;
  const cache = {};
  NativeModules[name] = new Proxy(
    {
      // NativeEventEmitter (RN) calls addListener/removeListeners on the module it wraps.
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop !== 'string') return undefined;
        if (!(prop in cache)) cache[prop] = jest.fn();
        return cache[prop];
      },
    },
  );
}

// `NativeEventEmitter` itself is redirected to RN's own __mocks__ sibling via `moduleNameMapper`
// (package.json jest config) — that mock ignores the native module, so `new NativeEventEmitter(x)`
// at bridge import time (network.ts, series.ts, OtaModule.ts) is inert instead of throwing.
