import { NativeModules } from 'react-native';

// Thin wrapper over the ScreenControlModule native bridge — keep-screen-on + immersive mode
// during reading. Generic screen concern (not reader-specific business logic), kept local to the
// reader screen. No decisions: the hook reads the prefs and calls these.
interface ScreenControlBridgeShape {
  keepScreenOn(): Promise<void>;
  allowScreenOff(): Promise<void>;
  getKeepScreenOnDuringReading(): Promise<boolean>;
  setImmersiveMode(enabled: boolean): Promise<void>;
  getImmersiveModeDuringReading(): Promise<boolean>;
}

const ScreenControlBridge: ScreenControlBridgeShape = NativeModules.ScreenControlModule;

export const ReaderScreenControl = {
  fetchKeepScreenOnPref: () => ScreenControlBridge.getKeepScreenOnDuringReading(),
  keepScreenOn: () => ScreenControlBridge.keepScreenOn(),
  allowScreenOff: () => ScreenControlBridge.allowScreenOff(),
  fetchImmersiveModePref: () => ScreenControlBridge.getImmersiveModeDuringReading(),
  setImmersiveMode: (enabled: boolean) => ScreenControlBridge.setImmersiveMode(enabled),
};
