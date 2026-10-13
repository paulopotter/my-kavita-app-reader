const mockInfo = jest.fn();
const mockExport = jest.fn();
const mockClear = jest.fn();
jest.mock('../../bridge', () => ({
  DiagnosticsBridge: {
    getInfo: (...a: unknown[]) => mockInfo(...a),
    exportLog: (...a: unknown[]) => mockExport(...a),
    clearLog: (...a: unknown[]) => mockClear(...a),
  },
}));

import { DiagnosticsService } from './diagnostics.services';

describe('DiagnosticsService.log', () => {
  beforeEach(() => jest.clearAllMocks());

  it('info returns what the bridge reports', async () => {
    const info = { path: '/p', sizeBytes: 10, adbCommand: 'adb pull /p' };
    mockInfo.mockResolvedValue(info);
    await expect(DiagnosticsService.log.info()).resolves.toEqual(info);
  });

  it('export and clear delegate to the bridge', async () => {
    mockExport.mockResolvedValue(undefined);
    mockClear.mockResolvedValue(undefined);
    await DiagnosticsService.log.export();
    await DiagnosticsService.log.clear();
    expect(mockExport).toHaveBeenCalledTimes(1);
    expect(mockClear).toHaveBeenCalledTimes(1);
  });
});
