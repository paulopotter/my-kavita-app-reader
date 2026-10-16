const mockGetAllIds = jest.fn();
jest.mock('../../bridge', () => ({
  FollowedSeriesBridge: { getAllIds: (...a: unknown[]) => mockGetAllIds(...a) },
}));

import { FollowedSeriesService } from './followed-series.services';

describe('FollowedSeriesService.ids', () => {
  it('get returns the followed ids straight from the bridge', async () => {
    mockGetAllIds.mockResolvedValue(['1', '2']);
    await expect(FollowedSeriesService.ids.get()).resolves.toEqual(['1', '2']);
  });
});
