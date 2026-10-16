const mockGet = jest.fn();
jest.mock('../../services/serials', () => ({ SerialService: { get: (...a: unknown[]) => mockGet(...a) } }));
const mockEmit = jest.fn();
jest.mock('../../managers/events', () => ({
  ...jest.requireActual('../../managers/events'),
  EventBus: { emit: (...a: unknown[]) => mockEmit(...a) },
}));

import { SerieEvents } from './serial.events';
import { REFRESH_DEBOUNCE_MS, SerialRefreshTool } from './serial-refresh.tool';

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ isSuccess: true });
});
afterEach(() => jest.useRealTimers());

const flush = async () => {
  await jest.advanceTimersByTimeAsync(REFRESH_DEBOUNCE_MS);
};

describe('SerialRefreshTool.afterReading', () => {
  it('re-fetches the series with force once reading goes quiet, then announces it', async () => {
    SerialRefreshTool.afterReading({ seriesId: 's1' });
    expect(mockGet).not.toHaveBeenCalled();
    await flush();
    expect(mockGet).toHaveBeenCalledWith({ seriesId: 's1', force: true });
    expect(mockEmit).toHaveBeenCalledWith(SerieEvents.refreshed, { seriesId: 's1' });
  });

  it('collapses a burst for the same series into one fetch, and keeps series apart', async () => {
    SerialRefreshTool.afterReading({ seriesId: 's1' });
    await jest.advanceTimersByTimeAsync(REFRESH_DEBOUNCE_MS - 1000);
    SerialRefreshTool.afterReading({ seriesId: 's1' });
    SerialRefreshTool.afterReading({ seriesId: 's2' });
    await flush();
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockGet).toHaveBeenCalledWith({ seriesId: 's1', force: true });
    expect(mockGet).toHaveBeenCalledWith({ seriesId: 's2', force: true });
  });

  it('announces nothing when the digest is a failure or the fetch rejects', async () => {
    mockGet.mockResolvedValueOnce({ isSuccess: false });
    SerialRefreshTool.afterReading({ seriesId: 's1' });
    await flush();
    mockGet.mockRejectedValueOnce(new Error('offline'));
    SerialRefreshTool.afterReading({ seriesId: 's1' });
    await flush();
    expect(mockEmit).not.toHaveBeenCalled();
  });
});
