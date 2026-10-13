const mockGet = jest.fn();
const mockSet = jest.fn();
jest.mock('../../bridge', () => ({
  ReaderFlagsBridge: { getPageBudgetMb: (...a: unknown[]) => mockGet(...a), setPageBudgetMb: (...a: unknown[]) => mockSet(...a) },
}));

import { ReaderFlagsService } from './reader-flags.services';

describe('ReaderFlagsService.pageBudget', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
  });

  it('get reads the current budget from the bridge', async () => {
    mockGet.mockResolvedValue(48);
    await expect(ReaderFlagsService.pageBudget.get()).resolves.toBe(48);
  });

  it('set forwards the value as a named argument and returns what native applied', async () => {
    mockSet.mockResolvedValue(96);
    await expect(ReaderFlagsService.pageBudget.set({ mb: 500 })).resolves.toBe(96);
    expect(mockSet).toHaveBeenCalledWith({ mb: 500 });
  });
});
