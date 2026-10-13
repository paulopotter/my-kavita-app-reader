import { ReaderFlagsBridge } from '../../bridge';

// Layer 4 — thin wrapper over ReaderFlagsBridge. No cache, no transformation. The allowed values
// are a UI concern (the picker's options); native clamps whatever it receives.
export const ReaderFlagsService = {
  pageBudget: {
    get(): Promise<number> {
      return ReaderFlagsBridge.getPageBudgetMb();
    },
    set({ mb }: { mb: number }): Promise<number> {
      return ReaderFlagsBridge.setPageBudgetMb({ mb });
    },
  },
};
