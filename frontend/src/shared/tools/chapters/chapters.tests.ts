import { ChapterTool, ChaptersTool } from './chapters.tool';

jest.mock('../../services/chapters', () => ({
  ChapterService: {
    get: jest.fn(),
    status: { set: jest.fn() },
  },
}));

jest.mock('../../managers/preferences', () => ({
  PreferencesManager: {
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import { ChapterService } from '../../services/chapters';
import { PreferencesManager } from '../../managers/preferences';
import type { ChapterDigestSuccess, ServerActiveInfo } from '../../bridge/digest';

const mockGet = ChapterService.get as jest.Mock;
const mockStatusSet = ChapterService.status.set as jest.Mock;
const mockPrefsGet = PreferencesManager.get as jest.Mock;
const mockPrefsPut = PreferencesManager.put as jest.Mock;
const mockPrefsDelete = PreferencesManager.delete as jest.Mock;

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

describe('ChapterTool.normalize', () => {
  it('copies every digest field onto the canonical shape', () => {
    const chapter = makeChapter({ id: 'c1', title: 'Chapter 1', decimalNumber: 1.5, number: 1 });
    const result = ChapterTool.normalize({ chapter, seriesId: 's1' });
    expect(result.id).toBe('c1');
    expect(result.seriesId).toBe('s1');
    expect(result.title).toBe('Chapter 1');
    expect(result.decimalNumber).toBe(1.5);
    expect(result.number).toBe(1);
    expect(result.readStatus).toBe('UNREAD');
  });

  it('attaches a navigate action to the reader route, without the origin (added later by useAction)', () => {
    const chapter = makeChapter({ id: 'c1' });
    const result = ChapterTool.normalize({ chapter, seriesId: 's1' });
    expect(result.action).toEqual({
      method: 'navigate',
      route: 'reader/:seriesId/:chapterId',
      params: { seriesId: 's1', chapterId: 'c1' },
    });
  });
});

describe('ChapterTool.mark.read', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves immediately with the optimistic READ value, without waiting for the network', async () => {
    mockStatusSet.mockReturnValue(new Promise(() => {})); // never settles in this test
    const result = await ChapterTool.mark.read({ seriesId: 's1', chapterId: 'c1' });
    expect(result).toEqual({ seriesId: 's1', chapterId: 'c1', readStatus: 'READ' });
  });

  it('calls onUpdate immediately with the optimistic value', () => {
    mockStatusSet.mockReturnValue(new Promise(() => {}));
    const onUpdate = jest.fn();
    ChapterTool.mark.read({ seriesId: 's1', chapterId: 'c1', onUpdate });
    expect(onUpdate).toHaveBeenCalledWith({ seriesId: 's1', chapterId: 'c1', readStatus: 'READ' });
  });

  it('calls onUpdate again confirming READ once the write succeeds', async () => {
    mockStatusSet.mockResolvedValue(undefined);
    const onUpdate = jest.fn();
    ChapterTool.mark.read({ seriesId: 's1', chapterId: 'c1', onUpdate });
    await flushPromises();
    expect(onUpdate).toHaveBeenNthCalledWith(1, { seriesId: 's1', chapterId: 'c1', readStatus: 'READ' });
    expect(onUpdate).toHaveBeenNthCalledWith(2, { seriesId: 's1', chapterId: 'c1', readStatus: 'READ' });
  });

  it('reverts to UNREAD (default) via onUpdate when the write fails and no prevStatus was given', async () => {
    mockStatusSet.mockRejectedValue(new Error('network down'));
    const onUpdate = jest.fn();
    ChapterTool.mark.read({ seriesId: 's1', chapterId: 'c1', onUpdate });
    await flushPromises();
    expect(onUpdate).toHaveBeenNthCalledWith(2, { seriesId: 's1', chapterId: 'c1', readStatus: 'UNREAD' });
  });

  it('reverts to the given prevStatus via onUpdate when the write fails', async () => {
    mockStatusSet.mockRejectedValue(new Error('network down'));
    const onUpdate = jest.fn();
    ChapterTool.mark.read({ seriesId: 's1', chapterId: 'c1', prevStatus: 'IN_PROGRESS', onUpdate });
    await flushPromises();
    expect(onUpdate).toHaveBeenNthCalledWith(2, { seriesId: 's1', chapterId: 'c1', readStatus: 'IN_PROGRESS' });
  });

  it('works without an onUpdate callback', async () => {
    mockStatusSet.mockResolvedValue(undefined);
    await expect(ChapterTool.mark.read({ seriesId: 's1', chapterId: 'c1' })).resolves.toBeDefined();
    await flushPromises();
  });

  it('works without an onUpdate callback when the write fails', async () => {
    mockStatusSet.mockRejectedValue(new Error('network down'));
    await expect(ChapterTool.mark.read({ seriesId: 's1', chapterId: 'c1' })).resolves.toBeDefined();
    await flushPromises();
  });
});

describe('ChapterTool.mark.unread', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves immediately with the optimistic UNREAD value', async () => {
    mockStatusSet.mockReturnValue(new Promise(() => {}));
    const result = await ChapterTool.mark.unread({ seriesId: 's1', chapterId: 'c1' });
    expect(result).toEqual({ seriesId: 's1', chapterId: 'c1', readStatus: 'UNREAD' });
  });

  it('reverts to READ (default) via onUpdate when the write fails and no prevStatus was given', async () => {
    mockStatusSet.mockRejectedValue(new Error('network down'));
    const onUpdate = jest.fn();
    ChapterTool.mark.unread({ seriesId: 's1', chapterId: 'c1', onUpdate });
    await flushPromises();
    expect(onUpdate).toHaveBeenNthCalledWith(2, { seriesId: 's1', chapterId: 'c1', readStatus: 'READ' });
  });

  it('confirms UNREAD via onUpdate once the write succeeds', async () => {
    mockStatusSet.mockResolvedValue(undefined);
    const onUpdate = jest.fn();
    ChapterTool.mark.unread({ seriesId: 's1', chapterId: 'c1', onUpdate });
    await flushPromises();
    expect(onUpdate).toHaveBeenNthCalledWith(2, { seriesId: 's1', chapterId: 'c1', readStatus: 'UNREAD' });
  });

  it('works without an onUpdate callback when the write fails', async () => {
    mockStatusSet.mockRejectedValue(new Error('network down'));
    await expect(ChapterTool.mark.unread({ seriesId: 's1', chapterId: 'c1' })).resolves.toBeDefined();
    await flushPromises();
  });

  it('reverts to the given prevStatus via onUpdate when the write fails', async () => {
    mockStatusSet.mockRejectedValue(new Error('network down'));
    const onUpdate = jest.fn();
    ChapterTool.mark.unread({ seriesId: 's1', chapterId: 'c1', prevStatus: 'IN_PROGRESS', onUpdate });
    await flushPromises();
    expect(onUpdate).toHaveBeenNthCalledWith(2, { seriesId: 's1', chapterId: 'c1', readStatus: 'IN_PROGRESS' });
  });
});

describe('ChapterTool.mark.toggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the real status and delegates to mark.read when it was UNREAD', async () => {
    mockGet.mockResolvedValue({ isSuccess: true, readStatus: 'UNREAD' });
    mockStatusSet.mockResolvedValue(undefined);
    const result = await ChapterTool.mark.toggle({ seriesId: 's1', chapterId: 'c1' });
    expect(mockStatusSet).toHaveBeenCalledWith({ seriesId: 's1', chapterId: 'c1', isRead: true });
    expect(result).toEqual({ seriesId: 's1', chapterId: 'c1', readStatus: 'READ' });
  });

  it('reads the real status and delegates to mark.read when it was IN_PROGRESS', async () => {
    mockGet.mockResolvedValue({ isSuccess: true, readStatus: 'IN_PROGRESS' });
    mockStatusSet.mockResolvedValue(undefined);
    const result = await ChapterTool.mark.toggle({ seriesId: 's1', chapterId: 'c1' });
    expect(mockStatusSet).toHaveBeenCalledWith({ seriesId: 's1', chapterId: 'c1', isRead: true });
    expect(result).toEqual({ seriesId: 's1', chapterId: 'c1', readStatus: 'READ' });
  });

  it('reads the real status and delegates to mark.unread when it was READ', async () => {
    mockGet.mockResolvedValue({ isSuccess: true, readStatus: 'READ' });
    mockStatusSet.mockResolvedValue(undefined);
    const result = await ChapterTool.mark.toggle({ seriesId: 's1', chapterId: 'c1' });
    expect(mockStatusSet).toHaveBeenCalledWith({ seriesId: 's1', chapterId: 'c1', isRead: false });
    expect(result).toEqual({ seriesId: 's1', chapterId: 'c1', readStatus: 'UNREAD' });
  });

  it('passes the real status down as prevStatus, so a failed write reverts to it', async () => {
    mockGet.mockResolvedValue({ isSuccess: true, readStatus: 'IN_PROGRESS' });
    mockStatusSet.mockRejectedValue(new Error('network down'));
    const onUpdate = jest.fn();
    await ChapterTool.mark.toggle({ seriesId: 's1', chapterId: 'c1', onUpdate });
    await flushPromises();
    expect(onUpdate).toHaveBeenLastCalledWith({ seriesId: 's1', chapterId: 'c1', readStatus: 'IN_PROGRESS' });
  });

  it('defaults to UNREAD as the assumed prior status when reading the digest fails', async () => {
    mockGet.mockResolvedValue({ isSuccess: false, error: { message: 'not found' } });
    mockStatusSet.mockResolvedValue(undefined);
    const result = await ChapterTool.mark.toggle({ seriesId: 's1', chapterId: 'c1' });
    expect(mockStatusSet).toHaveBeenCalledWith({ seriesId: 's1', chapterId: 'c1', isRead: true });
    expect(result).toEqual({ seriesId: 's1', chapterId: 'c1', readStatus: 'READ' });
  });
});

describe('ChaptersTool.sort', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get({ domain: "global" })', () => {
    it('returns the plain prefs when a global default was saved', async () => {
      mockPrefsGet.mockResolvedValue({ value: JSON.stringify({ mode: 'DESCENDING', progressPercent: 50 }) });
      const result = await ChaptersTool.sort.get({ domain: 'global' });
      expect(mockPrefsGet).toHaveBeenCalledWith({ key: 'global' });
      expect(result).toEqual({ mode: 'DESCENDING', progressPercent: 50 });
      expect('isOverride' in result).toBe(false);
    });

    it('falls back to the hardcoded default when no global was ever saved', async () => {
      mockPrefsGet.mockResolvedValue(null);
      const result = await ChaptersTool.sort.get({ domain: 'global' });
      expect(result).toEqual({ mode: 'ASCENDING', progressPercent: 50 });
    });
  });

  describe('get({ domain: "series" })', () => {
    it('returns the override plus isOverride:true when a per-series override exists', async () => {
      mockPrefsGet.mockResolvedValueOnce({ value: JSON.stringify({ mode: 'AUTO_FIXED', fixedThreshold: 3, progressPercent: 50 }) });
      const result = await ChaptersTool.sort.get({ domain: 'series', seriesId: 's1' });
      expect(mockPrefsGet).toHaveBeenCalledWith({ key: 's1' });
      expect(result).toEqual({ mode: 'AUTO_FIXED', fixedThreshold: 3, progressPercent: 50, isOverride: true });
    });

    it('falls through to the exact same global read when no override exists, without isOverride', async () => {
      mockPrefsGet
        .mockResolvedValueOnce(null) // series lookup — no override
        .mockResolvedValueOnce({ value: JSON.stringify({ mode: 'DESCENDING', progressPercent: 50 }) }); // global fallback
      const result = await ChaptersTool.sort.get({ domain: 'series', seriesId: 's1' });
      expect(mockPrefsGet).toHaveBeenNthCalledWith(1, { key: 's1' });
      expect(mockPrefsGet).toHaveBeenNthCalledWith(2, { key: 'global' });
      expect(result).toEqual({ mode: 'DESCENDING', progressPercent: 50 });
      expect('isOverride' in result).toBe(false);
    });

    it('falls back to the hardcoded default when neither the series nor the global was ever saved', async () => {
      mockPrefsGet.mockResolvedValue(null);
      const result = await ChaptersTool.sort.get({ domain: 'series', seriesId: 's1' });
      expect(result).toEqual({ mode: 'ASCENDING', progressPercent: 50 });
    });
  });

  describe('put', () => {
    it('writes to the global key when domain is "global"', async () => {
      mockPrefsPut.mockResolvedValue({});
      await ChaptersTool.sort.put({ domain: 'global' }, { mode: 'DESCENDING', progressPercent: 50 });
      expect(mockPrefsPut).toHaveBeenCalledWith({
        key: 'global',
        value: JSON.stringify({ mode: 'DESCENDING', progressPercent: 50 }),
        domain: 'chapterSortPrefs',
      });
    });

    it('writes to the seriesId key when domain is "series"', async () => {
      mockPrefsPut.mockResolvedValue({});
      await ChaptersTool.sort.put({ domain: 'series', seriesId: 's1' }, { mode: 'AUTO_FIXED', fixedThreshold: 3, progressPercent: 50 });
      expect(mockPrefsPut).toHaveBeenCalledWith({
        key: 's1',
        value: JSON.stringify({ mode: 'AUTO_FIXED', fixedThreshold: 3, progressPercent: 50 }),
        domain: 'chapterSortPrefs',
      });
    });
  });

  describe('reset', () => {
    it('deletes the series override and returns the global default that now applies', async () => {
      mockPrefsDelete.mockResolvedValue(undefined);
      mockPrefsGet.mockResolvedValue({ value: JSON.stringify({ mode: 'DESCENDING', progressPercent: 50 }) });
      const result = await ChaptersTool.sort.reset({ seriesId: 's1' });
      expect(mockPrefsDelete).toHaveBeenCalledWith({ key: 's1' });
      expect(mockPrefsGet).toHaveBeenCalledWith({ key: 'global' });
      expect(result).toEqual({ mode: 'DESCENDING', progressPercent: 50 });
    });

    it('falls back to the hardcoded default when no global was ever saved either', async () => {
      mockPrefsDelete.mockResolvedValue(undefined);
      mockPrefsGet.mockResolvedValue(null);
      const result = await ChaptersTool.sort.reset({ seriesId: 's1' });
      expect(result).toEqual({ mode: 'ASCENDING', progressPercent: 50 });
    });
  });
});
