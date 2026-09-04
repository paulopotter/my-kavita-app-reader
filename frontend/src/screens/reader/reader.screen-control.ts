import { NativeModules } from 'react-native';
import { ReaderPrefs } from '../../shared/tools/reader';

// Thin wrapper over the ScreenControlModule native bridge — keep-screen-on + immersive mode
// during reading. Generic screen concern (not reader-specific business logic), kept local to the
// reader screen. No decisions: the hook reads the prefs and calls these.
//
// The bridge is now side-effect-only (WindowManager) — Task 039 moved the pref *reads* to
// ReaderPrefs (:preferences, RN). fetchKeepScreenOnPref / fetchImmersiveModePref keep the same
// signature so the reader hook is untouched.
interface ScreenControlBridgeShape {
  keepScreenOn(): Promise<void>;
  allowScreenOff(): Promise<void>;
  setImmersiveMode(enabled: boolean): Promise<void>;
}

const ScreenControlBridge: ScreenControlBridgeShape = NativeModules.ScreenControlModule;

export const ReaderScreenControl = {
  fetchKeepScreenOnPref: () => ReaderPrefs.getKeepScreenOn(),
  keepScreenOn: () => ScreenControlBridge.keepScreenOn(),
  allowScreenOff: () => ScreenControlBridge.allowScreenOff(),
  fetchImmersiveModePref: () => ReaderPrefs.getImmersiveMode(),
  setImmersiveMode: (enabled: boolean) => ScreenControlBridge.setImmersiveMode(enabled),
};
