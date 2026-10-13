import { NativeModules } from 'react-native';

// Mirrors DiagnosticsBridgeModule.kt (android/app) 1:1 — the local diagnostics file the app keeps
// for troubles nobody is watching logcat for (a rare crash with the app closed). It never leaves the
// device on its own: it is read over adb or exported by the user.
export interface DiagnosticsInfoBridge {
  // Absolute path of the current log file on the device.
  path: string;
  // Both generations together.
  sizeBytes: number;
  // The adb command that reads it from a computer.
  adbCommand: string;
}

interface DiagnosticsBridgeModuleInterface {
  getInfo(): Promise<DiagnosticsInfoBridge>;
  // Opens the system share sheet with the whole log as a text file.
  exportLog(): Promise<void>;
  clearLog(): Promise<void>;
}

const native: DiagnosticsBridgeModuleInterface = NativeModules.DiagnosticsBridgeModule;

export const DiagnosticsBridge: DiagnosticsBridgeModuleInterface = {
  getInfo: () => native.getInfo(),
  exportLog: () => native.exportLog(),
  clearLog: () => native.clearLog(),
};
