import { ChapterTool } from './chapters.tool';
import { ChapterService } from '../../services/chapters';

jest.mock('../../services/chapters', () => ({
  ChapterService: {
    status: {
      setMany: jest.fn(),
    },
  },
}));

// markMany (readMany/unreadMany) batches its optimistic/confirmed/reverted updates into a single
// onUpdateMany call — see chapters.tool.ts's own doc on why: a caller applying N updates one at a
// time via onUpdate was re-copying its whole chapter list N times (O(n*m)), which showed up as a
// UI freeze marking a large selection read. onUpdate (per-id) must keep firing too, since some
// callers (and every ChapterEvents.readStatusChanged emission) still depend on it.
describe('ChapterTool.mark.readMany', () => {
  const setMany = ChapterService.status.setMany as jest.Mock;

  beforeEach(() => {
    setMany.mockReset();
  });

  it('calls onUpdateMany once with the whole batch on the optimistic phase, and onUpdate once per id', () => {
    setMany.mockReturnValue(new Promise(() => {})); // never resolves — isolates the synchronous optimistic phase
    const onUpdateMany = jest.fn();
    const onUpdate = jest.fn();

    ChapterTool.mark.readMany({
      seriesId: 's1',
      chapterIds: ['c1', 'c2', 'c3'],
      onUpdate,
      onUpdateMany,
    });

    expect(onUpdateMany).toHaveBeenCalledTimes(1);
    expect(onUpdateMany).toHaveBeenCalledWith([
      { seriesId: 's1', chapterId: 'c1', readStatus: 'READ' },
      { seriesId: 's1', chapterId: 'c2', readStatus: 'READ' },
      { seriesId: 's1', chapterId: 'c3', readStatus: 'READ' },
    ]);
    expect(onUpdate).toHaveBeenCalledTimes(3);
  });

  it('calls onUpdateMany again with the confirmed batch once the network call resolves', async () => {
    setMany.mockResolvedValue(undefined);
    const onUpdateMany = jest.fn();

    await ChapterTool.mark.readMany({ seriesId: 's1', chapterIds: ['c1', 'c2'], onUpdateMany });
    await Promise.resolve();
    await Promise.resolve();

    expect(onUpdateMany).toHaveBeenCalledTimes(2);
  });

  it('calls onUpdateMany once with the reverted batch when the network call fails', async () => {
    setMany.mockRejectedValue(new Error('network'));
    const onUpdateMany = jest.fn();

    await ChapterTool.mark.readMany({
      seriesId: 's1',
      chapterIds: ['c1', 'c2'],
      prevStatusById: { c1: 'UNREAD', c2: 'READ' },
      onUpdateMany,
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(onUpdateMany).toHaveBeenCalledTimes(2);
    expect(onUpdateMany).toHaveBeenLastCalledWith([
      { seriesId: 's1', chapterId: 'c1', readStatus: 'UNREAD' },
      { seriesId: 's1', chapterId: 'c2', readStatus: 'READ' },
    ]);
  });

  it('still makes exactly one ChapterService.status.setMany call for the whole batch', async () => {
    setMany.mockResolvedValue(undefined);

    await ChapterTool.mark.readMany({ seriesId: 's1', chapterIds: ['c1', 'c2', 'c3'] });

    expect(setMany).toHaveBeenCalledTimes(1);
    expect(setMany).toHaveBeenCalledWith({ seriesId: 's1', chapterIds: ['c1', 'c2', 'c3'], isRead: true });
  });
});
