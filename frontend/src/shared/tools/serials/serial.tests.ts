jest.mock('../../bridge/followed-series', () => ({
  FollowedSeriesBridge: {
    toggle: jest.fn(),
    isFollowed: jest.fn(),
  },
}));

import { SerieTool, type Serie } from './serial.tool';
import type { Strings } from '../../i18n/strings';
import { FollowedSeriesBridge } from '../../bridge/followed-series';
import type { ChapterDigestSuccess, SerialDigestSuccess, ServerActiveInfo } from '../../bridge/digest';

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

function makeSeriesDigest(overrides: Partial<SerialDigestSuccess> = {}): SerialDigestSuccess {
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

describe('SerieTool.resolveResumeChapterId', () => {
  type C = { id: string; number?: number; decimalNumber?: number; title: string; readStatus: 'READ' | 'IN_PROGRESS' | 'UNREAD' };
  const c = (o: Partial<C> & { id: string; readStatus: C['readStatus'] }): C => ({ number: 1, title: 't', ...o });

  it('returns the first IN_PROGRESS chapter in reading order', () => {
    expect(
      SerieTool.resolveResumeChapterId([
        c({ id: 'a', number: 1, readStatus: 'READ' }),
        c({ id: 'b', number: 2, readStatus: 'IN_PROGRESS' }),
        c({ id: 'd', number: 3, readStatus: 'IN_PROGRESS' }),
      ] as never),
    ).toBe('b');
  });

  it('falls back to the first UNREAD in reading order when none is IN_PROGRESS', () => {
    expect(
      SerieTool.resolveResumeChapterId([
        c({ id: 'a', number: 1, readStatus: 'READ' }),
        c({ id: 'd', number: 3, readStatus: 'UNREAD' }),
        c({ id: 'b', number: 2, readStatus: 'UNREAD' }),
      ] as never),
    ).toBe('b'); // sorted by number ascending, not list order
  });

  it('orders by decimalNumber when number is absent (fractional chapters)', () => {
    expect(
      SerieTool.resolveResumeChapterId([
        c({ id: 'x', number: undefined, decimalNumber: 10.5, readStatus: 'UNREAD' }),
        c({ id: 'y', number: undefined, decimalNumber: 10.1, readStatus: 'UNREAD' }),
      ] as never),
    ).toBe('y');
  });

  it('returns null when every chapter is READ', () => {
    expect(
      SerieTool.resolveResumeChapterId([
        c({ id: 'a', number: 1, readStatus: 'READ' }),
        c({ id: 'b', number: 2, readStatus: 'READ' }),
      ] as never),
    ).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(SerieTool.resolveResumeChapterId([])).toBeNull();
  });
});

describe('SerieTool.normalize.digest', () => {
  it('copies the series-level fields onto the canonical shape', () => {
    const digest = makeSeriesDigest({ name: 'One Piece', sortName: 'one piece' });
    const serie = SerieTool.normalize.digest({ digest });
    expect(serie.id).toBe('s1');
    expect(serie.name).toBe('One Piece');
    expect(serie.sortName).toBe('one piece');
  });

  it('normalizes each successful chapter, attaching a navigate action to the reader route', () => {
    const digest = makeSeriesDigest({
      chapters: { total: 1, list: [makeChapter({ id: 'c1' })] },
    });
    const serie = SerieTool.normalize.digest({ digest });
    expect(serie.chapters).toHaveLength(1);
    expect(serie.chapters[0].id).toBe('c1');
    expect(serie.chapters[0].action).toEqual({
      navigate: { to: { route: 'reader/:seriesId/:chapterId', params: { seriesId: 's1', chapterId: 'c1' } } },
    });
  });

  it('discards a chapter that failed to resolve', () => {
    const digest = makeSeriesDigest({
      chapters: {
        total: 2,
        list: [makeChapter({ id: 'c1' }), { isSuccess: false, error: { message: 'boom' } }],
      },
    });
    const serie = SerieTool.normalize.digest({ digest });
    expect(serie.chapters).toHaveLength(1);
    expect(serie.chapters[0].id).toBe('c1');
  });

  it('returns an empty chapters list when the digest has no chapters field', () => {
    const digest = makeSeriesDigest();
    const serie = SerieTool.normalize.digest({ digest });
    expect(serie.chapters).toEqual([]);
  });

  it('copies resumePoint from the digest as-is, without recomputing it', () => {
    const resumePoint = { stoppedAtChapterId: 'c1', stoppedAtChapterIndex: 0, status: 'IN_PROGRESS' as const };
    const digest = makeSeriesDigest({ chapters: { total: 1, list: [makeChapter({ id: 'c1' })], resumePoint } });
    const serie = SerieTool.normalize.digest({ digest });
    expect(serie.resumePoint).toBe(resumePoint);
  });

  it('leaves resumePoint undefined when the digest has no chapters field', () => {
    const digest = makeSeriesDigest();
    const serie = SerieTool.normalize.digest({ digest });
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

// ── normalize.card / relabel — the row shape the Library and Search both render ──────────────

const cardStrings = {
  publicationOngoing: 'Em andamento',
  publicationCompleted: 'Completo',
  publicationCancelled: 'Cancelado',
  publicationOnHiatus: 'Hiato',
  publicationAbandoned: 'Abandonado',
  readStatusUnread: 'Não lido',
  readStatusReading: 'Lendo',
  readStatusRead: 'Lido',
  chaptersFormat: 'caps.',
  hasErrors: 'Erros',
} as Strings;

function serial(over: Partial<Serie> = {}): Serie {
  return { ...SerieTool.normalize.digest({ digest: makeSeriesDigest() }), ...over };
}

// The raw→enum mapping has no public entry point of its own — it's a step of normalize.card,
// so it's exercised through the card (and through relabel, for the patched-in-place path).
describe('publication status mapping (through normalize.card)', () => {
  it.each([
    ['ongoing', 'ONGOING'],
    ['completed', 'COMPLETED'],
    ['ended', 'COMPLETED'],
    ['publishing_finished', 'COMPLETED'],
    ['cancelled', 'CANCELLED'],
    ['on_hiatus', 'ON_HIATUS'],
    ['hiatus', 'ON_HIATUS'],
    ['abandoned', 'ABANDONED'],
    ['OnGoing', 'ONGOING'],
  ])('maps %s → %s', (raw, expected) => {
    const card = SerieTool.normalize.card({
      serial: serial(), t: cardStrings, enrichment: { publicationStatus: raw },
    });
    expect(card.publicationStatus).toBe(expected);
  });

  it('undefined for unknown / empty / absent', () => {
    const of = (raw: string | undefined) =>
      SerieTool.normalize.card({ serial: serial(), t: cardStrings, enrichment: { publicationStatus: raw } })
        .publicationStatus;
    expect(of('weird')).toBeUndefined();
    expect(of('')).toBeUndefined();
    expect(of(undefined)).toBeUndefined();
  });
});

describe('SerieTool.normalize.card', () => {
  it('carries the identity fields straight through', () => {
    const card = SerieTool.normalize.card({ serial: serial(), t: cardStrings });
    expect(card.id).toBe('s1');
    expect(card.coverUrl).toBe(serial().coverImage.url);
  });

  it('page-based progress with no enrichment', () => {
    const card = SerieTool.normalize.card({
      serial: serial({ pages: { read: 25, total: 100 } }),
      t: cardStrings,
    });
    expect(card.progressFraction).toBe(0.25);
    expect(card.progressLabel).toBe('25%');
    expect(card.readStatus).toBe('IN_PROGRESS');
    expect(card.readStatusLabel).toBe('Lendo');
    expect(card.chapterCountLabel).toBeUndefined();
  });

  it('chapter-based progress wins over pages when the enrichment has counts', () => {
    const card = SerieTool.normalize.card({
      serial: serial({ pages: { read: 90, total: 100 } }),
      t: cardStrings,
      enrichment: { readChapters: 3, totalChapters: 12 },
    });
    expect(card.progressFraction).toBeCloseTo(0.25);
    expect(card.chapterCountLabel).toBe('3/12 caps.');
  });

  it('READ / UNREAD at the chapter-count boundaries', () => {
    const read = SerieTool.normalize.card({
      serial: serial(), t: cardStrings, enrichment: { readChapters: 12, totalChapters: 12 },
    });
    const unread = SerieTool.normalize.card({
      serial: serial(), t: cardStrings, enrichment: { readChapters: 0, totalChapters: 12 },
    });
    expect(read.readStatus).toBe('READ');
    expect(read.readStatusLabel).toBe('Lido');
    expect(unread.readStatus).toBe('UNREAD');
  });

  it('clamps a page fraction above 1 → READ', () => {
    const card = SerieTool.normalize.card({
      serial: serial({ pages: { read: 250, total: 100 } }),
      t: cardStrings,
    });
    expect(card.progressFraction).toBe(1);
    expect(card.readStatus).toBe('READ');
  });

  it('zero progress when pages is absent or total is 0', () => {
    expect(SerieTool.normalize.card({ serial: serial({ pages: undefined }), t: cardStrings }).progressFraction).toBe(0);
    expect(
      SerieTool.normalize.card({ serial: serial({ pages: { read: 0, total: 0 } }), t: cardStrings }).progressFraction,
    ).toBe(0);
  });

  it('builds the BFF labels from the enrichment', () => {
    const card = SerieTool.normalize.card({
      serial: serial(),
      t: cardStrings,
      enrichment: { publicationStatus: 'completed', downloadedChapters: 40, bffTotalChapters: 40, hasErrors: true },
    });
    expect(card.publicationStatus).toBe('COMPLETED');
    expect(card.publicationLabel).toBe('Completo');
    expect(card.downloadedLabel).toBe('40/40 caps.');
    expect(card.errorsLabel).toBe('Erros');
  });

  it('omits every optional label when the caller has no enrichment — Search passes none', () => {
    const card = SerieTool.normalize.card({ serial: serial(), t: cardStrings });
    expect(card.publicationLabel).toBeUndefined();
    expect(card.downloadedLabel).toBeUndefined();
    expect(card.errorsLabel).toBeUndefined();
    expect(card.chapterCountLabel).toBeUndefined();
    expect(card.isFollowed).toBe(false);
    // …and the row still renders: identity + progress are always there.
    expect(card.name).toBe(serial().name);
    expect(card.progressLabel).toBe('0%');
  });

  it('publication cascade falls through an UNRECOGNIZED status, not just an absent one', () => {
    const card = SerieTool.normalize.card({
      serial: serial(),
      t: cardStrings,
      enrichment: { publicationStatus: 'weird', fallbackPublicationStatus: 'Ended' },
    });
    expect(card.publicationStatus).toBe('COMPLETED');
  });

  it('a recognized status wins over the fallback', () => {
    const card = SerieTool.normalize.card({
      serial: serial(),
      t: cardStrings,
      enrichment: { publicationStatus: 'ongoing', fallbackPublicationStatus: 'Ended' },
    });
    expect(card.publicationStatus).toBe('ONGOING');
  });

  it('falls back to the serial metadata publication status when the enrichment has none', () => {
    const card = SerieTool.normalize.card({
      serial: serial({ metadata: { publicationStatus: 'Hiatus' } as Serie['metadata'] }),
      t: cardStrings,
    });
    expect(card.publicationStatus).toBe('ON_HIATUS');
  });

  it('carries isFollowed and lastChapterAddedEpochMs', () => {
    const card = SerieTool.normalize.card({
      serial: serial({ lastUpdatesUTC: { chapterAdded: 1738555506000 } as Serie['lastUpdatesUTC'] }),
      t: cardStrings,
      enrichment: { isFollowed: true },
    });
    expect(card.isFollowed).toBe(true);
    expect(card.lastChapterAddedEpochMs).toBe(1738555506000);
  });
});

describe('SerieTool.relabel', () => {
  it('rebuilds progress and labels from patched counts', () => {
    const card = SerieTool.normalize.card({
      serial: serial(), t: cardStrings, enrichment: { readChapters: 1, totalChapters: 10 },
    });
    const patched = SerieTool.relabel({ card: { ...card, readChapters: 5 }, t: cardStrings });
    expect(patched.progressFraction).toBeCloseTo(0.5);
    expect(patched.progressLabel).toBe('50%');
    expect(patched.chapterCountLabel).toBe('5/10 caps.');
    expect(patched.readStatus).toBe('IN_PROGRESS');
  });

  it('rebuilds the BFF labels from the raw counts carried on the card', () => {
    const card = SerieTool.normalize.card({ serial: serial(), t: cardStrings });
    const patched = SerieTool.relabel({
      card: { ...card, downloadedChapters: 7, totalChapters: 20, hasErrors: true },
      t: cardStrings,
    });
    expect(patched.downloadedLabel).toBe('7/20 caps.');
    expect(patched.errorsLabel).toBe('Erros');
  });

  it('leaves a page-only row\'s progress alone (no chapter counts to recompute from)', () => {
    const card = SerieTool.normalize.card({
      serial: serial({ pages: { read: 30, total: 100 } }), t: cardStrings,
    });
    const patched = SerieTool.relabel({ card, t: cardStrings });
    expect(patched.progressFraction).toBe(0.3);
    expect(patched.readStatus).toBe('IN_PROGRESS');
  });

  it('maps a raw status written by an in-place patch', () => {
    const card = SerieTool.normalize.card({ serial: serial(), t: cardStrings });
    expect(card.publicationStatus).toBeUndefined();
    // What the Library's lazy BFF enrichment does: write the raw string, let relabel map it.
    const patched = SerieTool.relabel({ card: { ...card, rawPublicationStatus: 'hiatus' }, t: cardStrings });
    expect(patched.publicationStatus).toBe('ON_HIATUS');
    expect(patched.publicationLabel).toBe('Hiato');
  });

  it('keeps an already-mapped status when there is no raw one to remap', () => {
    const card = SerieTool.normalize.card({
      serial: serial(), t: cardStrings, enrichment: { publicationStatus: 'ongoing' },
    });
    const patched = SerieTool.relabel({ card: { ...card, rawPublicationStatus: undefined }, t: cardStrings });
    expect(patched.publicationStatus).toBe('ONGOING');
  });

  it('relabels into another language', () => {
    const card = SerieTool.normalize.card({
      serial: serial(), t: cardStrings, enrichment: { readChapters: 2, totalChapters: 2 },
    });
    expect(card.readStatusLabel).toBe('Lido');
    const en = SerieTool.relabel({
      card,
      t: { ...cardStrings, readStatusRead: 'Read', chaptersFormat: 'ch.' } as Strings,
    });
    expect(en.readStatusLabel).toBe('Read');
    expect(en.chapterCountLabel).toBe('2/2 ch.');
  });
});
