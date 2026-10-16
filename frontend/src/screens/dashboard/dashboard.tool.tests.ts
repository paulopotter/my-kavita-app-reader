import { getStrings } from '../../shared/i18n/strings';
import type { Serie } from '../../shared/tools/serials';
import { CONTINUE_CANDIDATE_BUFFER, DASHBOARD_LIMITS, DashboardTool } from './dashboard.tool';

const t = getStrings('en');
const NOW = 1_800_000_000_000;
const HOUR = 3_600_000;

function serie(over: Partial<Serie> & { id: string }): Serie {
  return {
    name: `Serie ${over.id}`,
    coverImage: { url: `cover-${over.id}` } as Serie['coverImage'],
    chapters: [],
    resolvedAtEpochMs: 0,
    server: {} as Serie['server'],
    events: {} as Serie['events'],
    ...over,
  };
}

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => jest.restoreAllMocks());

describe('DashboardTool.continueCandidates', () => {
  it('keeps only started-and-unfinished series, most recently read first, plus the buffer', () => {
    const series = [
      serie({ id: 'unread', pages: { read: 0, total: 10 } }),
      serie({ id: 'done', pages: { read: 10, total: 10 }, lastUpdatesUTC: { readDate: NOW } }),
      serie({ id: 'old', pages: { read: 1, total: 10 }, lastUpdatesUTC: { readDate: NOW - 5 * HOUR } }),
      serie({ id: 'new', pages: { read: 4, total: 10 }, lastUpdatesUTC: { readDate: NOW - HOUR } }),
      serie({ id: 'nopages' }),
    ];
    expect(DashboardTool.continueCandidates({ series, limit: 5 }).map(s => s.id)).toEqual(['new', 'old']);
  });

  it('caps at limit + buffer', () => {
    const series = Array.from({ length: 20 }, (_, i) =>
      serie({ id: String(i), pages: { read: 1, total: 10 }, lastUpdatesUTC: { readDate: NOW - i } }),
    );
    expect(DashboardTool.continueCandidates({ series, limit: 3 })).toHaveLength(3 + CONTINUE_CANDIDATE_BUFFER);
  });

  it('treats a missing or year-1 read date as the oldest', () => {
    const series = [
      serie({ id: 'never', pages: { read: 1, total: 10 }, lastUpdatesUTC: { readDate: -62_135_596_800_000 } }),
      serie({ id: 'some', pages: { read: 1, total: 10 }, lastUpdatesUTC: { readDate: NOW } }),
    ];
    expect(DashboardTool.continueCandidates({ series, limit: 5 }).map(s => s.id)).toEqual(['some', 'never']);
  });
});

describe('DashboardTool.continueItem', () => {
  const chapter = (over: Record<string, unknown>) =>
    ({ id: 'c10', number: 10, pages: { count: 20, readCount: 5, list: [] }, ...over }) as unknown as Serie['chapters'][number];

  it('opens the resume chapter with its number and a chapter progress bar', () => {
    const item = DashboardTool.continueItem({
      serie: serie({
        id: 's1',
        chapters: [chapter({})],
        resumePoint: { stoppedAtChapterId: 'c10', stoppedAtChapterIndex: 9, status: 'IN_PROGRESS' },
      }),
      t,
    });
    expect(item).toEqual({
      seriesId: 's1',
      chapterId: 'c10',
      name: 'Serie s1',
      coverUrl: 'cover-s1',
      caption: 'Ch. 10',
      progressFraction: 0.25,
    });
  });

  it('prefers the decimal number and shows a special chapter by its label', () => {
    const decimal = DashboardTool.continueItem({
      serie: serie({
        id: 's1',
        chapters: [chapter({ decimalNumber: 10.5 })],
        resumePoint: { stoppedAtChapterId: 'c10', stoppedAtChapterIndex: 9, status: 'IN_PROGRESS' },
      }),
      t,
    });
    expect(decimal?.caption).toBe('Ch. 10.5');
    const special = DashboardTool.continueItem({
      serie: serie({
        id: 's1',
        chapters: [chapter({ isSpecial: true, specialLabel: 'Extra' })],
        resumePoint: { stoppedAtChapterId: 'c10', stoppedAtChapterIndex: 9, status: 'IN_PROGRESS' },
      }),
      t,
    });
    expect(special?.caption).toBe('Ch. Extra');
  });

  it('draws no bar when the chapter is unread, has no page counts or nothing was read in it', () => {
    const base = { id: 's1', resumePoint: { stoppedAtChapterId: 'c10', stoppedAtChapterIndex: 9, status: 'UNREAD' as const } };
    expect(
      DashboardTool.continueItem({ serie: serie({ ...base, chapters: [chapter({})] }), t })?.progressFraction,
    ).toBeUndefined();
    const inProgress = { ...base, resumePoint: { ...base.resumePoint, status: 'IN_PROGRESS' as const } };
    expect(
      DashboardTool.continueItem({
        serie: serie({ ...inProgress, chapters: [chapter({ pages: { list: [] } })] }),
        t,
      })?.progressFraction,
    ).toBeUndefined();
    expect(
      DashboardTool.continueItem({
        serie: serie({ ...inProgress, chapters: [chapter({ pages: { count: 20, readCount: 0, list: [] } })] }),
        t,
      })?.progressFraction,
    ).toBeUndefined();
  });

  it('still opens the chapter, with no caption, when the resume chapter is not in the list', () => {
    const item = DashboardTool.continueItem({
      serie: serie({ id: 's1', resumePoint: { stoppedAtChapterId: 'zz', stoppedAtChapterIndex: 0, status: 'UNREAD' } }),
      t,
    });
    expect(item?.chapterId).toBe('zz');
    expect(item?.caption).toBeUndefined();
  });

  it('returns null when every chapter is read (no resume point)', () => {
    expect(DashboardTool.continueItem({ serie: serie({ id: 's1' }), t })).toBeNull();
  });
});

describe('DashboardTool.latestChapters', () => {
  it('lists followed series whose newest chapter is later than their last read, newest first', () => {
    const series = [
      serie({ id: 'a', lastUpdatesUTC: { chapterAdded: NOW - 2 * HOUR, readDate: NOW - 5 * HOUR } }),
      serie({ id: 'b', lastUpdatesUTC: { chapterAdded: NOW - HOUR } }),
      serie({ id: 'caught-up', lastUpdatesUTC: { chapterAdded: NOW - 5 * HOUR, readDate: NOW - HOUR } }),
      serie({ id: 'not-followed', lastUpdatesUTC: { chapterAdded: NOW } }),
      serie({ id: 'no-date' }),
    ];
    const items = DashboardTool.latestChapters({
      series,
      followedIds: new Set(['a', 'b', 'caught-up', 'no-date']),
      limit: 5,
      t,
    });
    expect(items.map(i => i.seriesId)).toEqual(['b', 'a']);
    expect(items[0].caption).toBe(t.dateHoursAgo.replace('{0}', '1'));
  });

  it('respects the limit', () => {
    const series = Array.from({ length: 5 }, (_, i) => serie({ id: String(i), lastUpdatesUTC: { chapterAdded: NOW - i * HOUR } }));
    const followedIds = new Set(series.map(s => s.id));
    expect(DashboardTool.latestChapters({ series, followedIds, limit: 2, t })).toHaveLength(2);
  });
});

describe('DashboardTool.recentlyUpdated', () => {
  it('sorts every series with a chapter date by it, newest first, within the limit', () => {
    const series = [
      serie({ id: 'a', lastUpdatesUTC: { chapterAdded: NOW - 3 * HOUR } }),
      serie({ id: 'b', lastUpdatesUTC: { chapterAdded: NOW - HOUR } }),
      serie({ id: 'never', lastUpdatesUTC: { chapterAdded: -62_135_596_800_000 } }),
      serie({ id: 'none' }),
    ];
    expect(DashboardTool.recentlyUpdated({ series, limit: 5, t }).map(i => i.seriesId)).toEqual(['b', 'a']);
    expect(DashboardTool.recentlyUpdated({ series, limit: 1, t })).toHaveLength(1);
  });
});

describe('DashboardTool.recentlyAdded', () => {
  it('sorts by the date the series first appeared, newest first, ignoring undated ones', () => {
    const series = [
      serie({ id: 'a', lastUpdatesUTC: { created: NOW - 3 * HOUR } }),
      serie({ id: 'b', lastUpdatesUTC: { created: NOW - HOUR, chapterAdded: NOW } }),
      serie({ id: 'never', lastUpdatesUTC: { created: -62_135_596_800_000 } }),
      serie({ id: 'none' }),
    ];
    const items = DashboardTool.recentlyAdded({ series, limit: 5, t });
    expect(items.map(i => i.seriesId)).toEqual(['b', 'a']);
    expect(items[0].caption).toBe(t.dateHoursAgo.replace('{0}', '1'));
    expect(DashboardTool.recentlyAdded({ series, limit: 1, t })).toHaveLength(1);
  });
});

describe('DashboardTool.unreadFollowed', () => {
  it('lists followed series with pages left, newest chapter first, with a percent caption', () => {
    const series = [
      serie({ id: 'a', pages: { read: 0, total: 10 }, lastUpdatesUTC: { chapterAdded: NOW - 2 * HOUR } }),
      serie({ id: 'b', pages: { read: 5, total: 10 }, lastUpdatesUTC: { chapterAdded: NOW - HOUR } }),
      serie({ id: 'finished', pages: { read: 10, total: 10 } }),
      serie({ id: 'empty', pages: { read: 0, total: 0 } }),
      serie({ id: 'other', pages: { read: 0, total: 10 } }),
      serie({ id: 'nopages' }),
    ];
    const items = DashboardTool.unreadFollowed({
      series,
      followedIds: new Set(['a', 'b', 'finished', 'empty', 'nopages']),
      limit: 5,
      t,
    });
    expect(items.map(i => i.seriesId)).toEqual(['b', 'a']);
    expect(items[0]).toMatchObject({ caption: '50% read', progressFraction: 0.5 });
    expect(items[1]).toMatchObject({ caption: '0% read', progressFraction: undefined });
  });
});

describe('DashboardTool.stats', () => {
  it('counts the library, the followed series that exist and the series in progress', () => {
    const series = [
      serie({ id: 'a', pages: { read: 1, total: 10 } }),
      serie({ id: 'b', pages: { read: 10, total: 10 } }),
      serie({ id: 'c' }),
    ];
    expect(DashboardTool.stats({ series, followedIds: new Set(['a', 'gone']) })).toEqual({
      series: 3,
      followed: 1,
      inProgress: 1,
    });
  });
});

describe('DashboardTool.build', () => {
  it('assembles every rail, dropping continue candidates with nothing to resume and capping the rail', () => {
    const resumable = Array.from({ length: DASHBOARD_LIMITS.continueReading + 2 }, (_, i) =>
      serie({
        id: `r${i}`,
        resumePoint: { stoppedAtChapterId: `c${i}`, stoppedAtChapterIndex: 0, status: 'UNREAD' },
      }),
    );
    const data = DashboardTool.build({
      series: [serie({ id: 'x', lastUpdatesUTC: { chapterAdded: NOW - HOUR } })],
      followedIds: new Set(['x']),
      continueSeries: [serie({ id: 'fully-read' }), ...resumable],
      t,
    });
    expect(data.continueReading).toHaveLength(DASHBOARD_LIMITS.continueReading);
    expect(data.continueReading[0].seriesId).toBe('r0');
    expect(data.latestChapters.map(i => i.seriesId)).toEqual(['x']);
    expect(data.recentlyUpdated.map(i => i.seriesId)).toEqual(['x']);
    expect(data.unreadFollowed).toEqual([]);
    expect(data.recentlyAdded).toEqual([]);
    expect(data.stats).toEqual({ series: 1, followed: 1, inProgress: 0 });
  });
});
