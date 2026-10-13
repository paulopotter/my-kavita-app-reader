import { NativeModules } from 'react-native';

// Mirrors ReaderFlagsBridgeModule.kt (android/app) 1:1 — the reader's debug-menu flags. Today only
// the decoded-page size budget (MB): the largest bitmap the native page decoder produces; taller
// pages are scaled down to fit. Native clamps the value into its own allowed range and persists it.
interface ReaderFlagsBridgeModuleInterface {
  getPageBudgetMb(): Promise<number>;
  // Resolves with the value actually applied (after native clamping).
  setPageBudgetMb(params: { mb: number }): Promise<number>;
}

// The native module itself takes positional args — this thin object wraps each call so the rest
// of the RN codebase only ever sees the named-argument shape above.
const native: {
  getPageBudgetMb(): Promise<number>;
  setPageBudgetMb(mb: number): Promise<number>;
} = NativeModules.ReaderFlagsBridgeModule;

export const ReaderFlagsBridge: ReaderFlagsBridgeModuleInterface = {
  getPageBudgetMb: () => native.getPageBudgetMb(),
  setPageBudgetMb: ({ mb }) => native.setPageBudgetMb(mb),
};
