import { DiagnosticsBridge } from '../../bridge';
import type { DiagnosticsInfoBridge } from '../../bridge';

// Layer 4 — thin wrapper over DiagnosticsBridge. No cache, no transformation.
export const DiagnosticsService = {
  log: {
    info(): Promise<DiagnosticsInfoBridge> {
      return DiagnosticsBridge.getInfo();
    },
    export(): Promise<void> {
      return DiagnosticsBridge.exportLog();
    },
    clear(): Promise<void> {
      return DiagnosticsBridge.clearLog();
    },
  },
};
