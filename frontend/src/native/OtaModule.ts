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

// Background-download phase reported by the Kotlin side. 'idle' = nothing downloading;
// 'downloading' = in flight (progress -1 means indeterminate, 0..1 otherwise); 'ready' = a new
// bundle finished and is waiting for a restart; 'failed' = the download errored (non-blocking).
export type OtaDownloadPhase = 'idle' | 'downloading' | 'ready' | 'failed';

export interface OtaState {
  phase: OtaDownloadPhase;
  progress: number;
  policy: OtaPolicy | null;
}

export interface OtaDownloadProgressEvent {
  phase: OtaDownloadPhase;
  progress: number;
}

export const OtaModule = NativeModules.OtaEventBridge as {
  applyOtaUpdate: () => void;
  getVersions: () => Promise<AppVersions>;
  // Returns the pending OTA policy set by SplashActivity, or null if none.
  getOtaPolicy: () => Promise<OtaPolicy | null>;
  // Snapshot of the background-download state — read once on mount so a download that finished (or
  // started) before the RN splash could subscribe to 'otaDownloadProgress' isn't missed.
  getOtaState: () => Promise<OtaState>;
  // Clears the pending policy after user acknowledges.
  acknowledgePolicy: () => Promise<void>;
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
};

export const OtaEmitter = new NativeEventEmitter(OtaModule);
