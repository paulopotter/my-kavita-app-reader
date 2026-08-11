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

export const OtaModule = NativeModules.OtaEventBridge as {
  applyOtaUpdate: () => void;
  getVersions: () => Promise<AppVersions>;
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
};

export const OtaEmitter = new NativeEventEmitter(OtaModule);
