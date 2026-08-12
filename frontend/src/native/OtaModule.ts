import { NativeEventEmitter, NativeModules } from 'react-native';

// TODO: connect to the notification bell when the notifications story is implemented.
// Usage (in the notifications feature):
//   const sub = OtaEmitter.addListener('otaBundleReady', () => { /* show badge */ });
//   OtaModule.applyOtaUpdate(); // called when user confirms restart

export interface AppVersions {
  app: string;
  backend: string;
  frontend: string;
}

export type OtaPolicyMode = 'required' | 'highly_recommended' | 'recommended';

export interface OtaPolicy {
  mode: OtaPolicyMode;
  releaseNotesUrl: string;
}

export const OtaModule = NativeModules.OtaEventBridge as {
  applyOtaUpdate: () => void;
  getVersions: () => Promise<AppVersions>;
  // Returns the pending OTA policy set by SplashActivity, or null if none.
  getOtaPolicy: () => Promise<OtaPolicy | null>;
  // Clears the pending policy after user acknowledges.
  acknowledgePolicy: () => Promise<void>;
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
};

export const OtaEmitter = new NativeEventEmitter(OtaModule);
