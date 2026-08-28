jest.mock('../../bridge/followedSeries', () => ({
  FollowedSeriesBridge: {
    toggle: jest.fn(),
    isFollowed: jest.fn(),
  },
}));

import { SerieTool } from './serie.tool';
import { FollowedSeriesBridge } from '../../bridge/followedSeries';
import type { ChapterDigestSuccess, SeriesDigestSuccess, ServerActiveInfo } from '../../bridge/digest';

const mockToggle = FollowedSeriesBridge.toggle as jest.Mock;
const mockIsFollowed = FollowedSeriesBridge.isFollowed as jest.Mock;

// Lets a pending .then()/.catch() chain attached to a mock Promise settle before assertions run.
const flushPromises = () => Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve());

const server: ServerActiveInfo = {
  groupId: 'g1',
  groupName: 'group',
  providerId: 'kavita',
  urlId: 'u1',
  url: 'https://example.invalid',
  timeoutMs: 5000,
  priority: 0,
};

function makeChapter(overrides: Partial<ChapterDigestSuccess> = {}): ChapterDigestSuccess {
  return {
    isSuccess: true,
    id: 'c1',
    seriesId: 's1',
    title: 'Chapter 1',
    coverImage: { url: '', hasFetchedDimensions: false, resolvedAtEpochMs: 0, server, cache: null },
    readStatus: 'UNREAD',
    pages: { list: [] },
    resolvedAtEpochMs: 1,
    server,
    cache: null,
    ...overrides,
  };
}

function makeSeriesDigest(overrides: Partial<SeriesDigestSuccess> = {}): SeriesDigestSuccess {
  return {
    isSuccess: true,
    id: 's1',
    name: 'Series One',
    coverImage: { url: '', hasFetchedDimensions: false, resolvedAtEpochMs: 0, server, cache: null },
    resolvedAtEpochMs: 1,
    server,
    cache: null,
    ...overrides,
  };
}

describe('SerieTool.normalize', () => {
  it('copies the series-level fields onto the canonical shape', () => {
    const digest = makeSeriesDigest({ name: 'One Piece', sortName: 'one piece' });
    const serie = SerieTool.normalize({ digest });
    expect(serie.id).toBe('s1');
    expect(serie.name).toBe('One Piece');
    expect(serie.sortName).toBe('one piece');
  });

  it('normalizes each successful chapter, attaching a navigate action to the reader route', () => {
    const digest = makeSeriesDigest({
      chapters: { total: 1, list: [makeChapter({ id: 'c1' })] },
    });
    const serie = SerieTool.normalize({ digest });
    expect(serie.chapters).toHaveLength(1);
    expect(serie.chapters[0].id).toBe('c1');
    expect(serie.chapters[0].action).toEqual({
      method: 'navigate',
      route: 'reader/:seriesId/:chapterId',
      params: { seriesId: 's1', chapterId: 'c1' },
    });
  });

  it('discards a chapter that failed to resolve', () => {
    const digest = makeSeriesDigest({
      chapters: {
        total: 2,
        list: [makeChapter({ id: 'c1' }), { isSuccess: false, error: { message: 'boom' } }],
      },
    });
    const serie = SerieTool.normalize({ digest });
    expect(serie.chapters).toHaveLength(1);
    expect(serie.chapters[0].id).toBe('c1');
  });

  it('returns an empty chapters list when the digest has no chapters field', () => {
    const digest = makeSeriesDigest();
    const serie = SerieTool.normalize({ digest });
    expect(serie.chapters).toEqual([]);
  });

  it('copies resumePoint from the digest as-is, without recomputing it', () => {
    const resumePoint = { stoppedAtChapterId: 'c1', stoppedAtChapterIndex: 0, status: 'IN_PROGRESS' as const };
    const digest = makeSeriesDigest({ chapters: { total: 1, list: [makeChapter({ id: 'c1' })], resumePoint } });
    const serie = SerieTool.normalize({ digest });
    expect(serie.resumePoint).toBe(resumePoint);
  });

  it('leaves resumePoint undefined when the digest has no chapters field', () => {
    const digest = makeSeriesDigest();
    const serie = SerieTool.normalize({ digest });
    expect(serie.resumePoint).toBeUndefined();
  });
});

describe('SerieTool.isFollowed / toggleFollow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('isFollowed forwards seriesId to FollowedSeriesBridge.isFollowed', async () => {
    mockIsFollowed.mockResolvedValue(true);
    const result = await SerieTool.isFollowed('s1');
    expect(mockIsFollowed).toHaveBeenCalledWith({ seriesId: 's1' });
    expect(result).toBe(true);
  });

  it('resolves immediately with the optimistic value (true when prevValue is omitted)', async () => {
    mockToggle.mockReturnValue(new Promise(() => {}));
    const result = await SerieTool.toggleFollow({ seriesId: 's1' });
    expect(result).toBe(true);
  });

  it('resolves with the optimistic opposite of prevValue', async () => {
    mockToggle.mockReturnValue(new Promise(() => {}));
    const result = await SerieTool.toggleFollow({ seriesId: 's1', prevValue: true });
    expect(result).toBe(false);
  });

  it('calls onUpdate immediately with the optimistic value', () => {
    mockToggle.mockReturnValue(new Promise(() => {}));
    const onUpdate = jest.fn();
    SerieTool.toggleFollow({ seriesId: 's1', prevValue: false, onUpdate });
    expect(onUpdate).toHaveBeenCalledWith(true);
  });

  it('confirms the optimistic value via onUpdate once the bridge call succeeds', async () => {
    mockToggle.mockResolvedValue(undefined);
    const onUpdate = jest.fn();
    SerieTool.toggleFollow({ seriesId: 's1', prevValue: false, onUpdate });
    await flushPromises();
    expect(onUpdate).toHaveBeenNthCalledWith(2, true);
  });

  it('reverts via onUpdate when the bridge call fails', async () => {
    mockToggle.mockRejectedValue(new Error('network down'));
    const onUpdate = jest.fn();
    SerieTool.toggleFollow({ seriesId: 's1', prevValue: false, onUpdate });
    await flushPromises();
    expect(onUpdate).toHaveBeenNthCalledWith(2, false);
  });

  it('forwards seriesId to FollowedSeriesBridge.toggle', async () => {
    mockToggle.mockResolvedValue(undefined);
    await SerieTool.toggleFollow({ seriesId: 's1' });
    expect(mockToggle).toHaveBeenCalledWith({ seriesId: 's1' });
  });

  it('works without an onUpdate callback when the bridge call fails', async () => {
    mockToggle.mockRejectedValue(new Error('network down'));
    await expect(SerieTool.toggleFollow({ seriesId: 's1' })).resolves.toBeDefined();
    await flushPromises();
  });
});
