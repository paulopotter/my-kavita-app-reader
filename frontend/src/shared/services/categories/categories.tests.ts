const mockList = jest.fn();
const mockIds = jest.fn();
jest.mock('../../bridge', () => ({
  ServerBridge: {
    listCategories: (...a: unknown[]) => mockList(...a),
    getSerialIdsByCategories: (...a: unknown[]) => mockIds(...a),
  },
}));

import { CategoriesService } from './categories.services';

describe('CategoriesService', () => {
  it('list returns the category names straight from the bridge', async () => {
    mockList.mockResolvedValue(['Action', 'Drama']);
    await expect(CategoriesService.list()).resolves.toEqual(['Action', 'Drama']);
  });

  it('serials.ids forwards the names and returns the series ids', async () => {
    mockIds.mockResolvedValue(['1', '2']);
    await expect(CategoriesService.serials.ids({ names: ['Action'] })).resolves.toEqual(['1', '2']);
    expect(mockIds).toHaveBeenCalledWith(['Action']);
  });
});
