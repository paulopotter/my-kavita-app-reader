import { LibraryTool, normalizePublicationStatus } from './library.tool';
import type { ExternalMetadataMatch } from '../../shared/bridge/external';
import type { Serie } from '../../shared/tools/series';
import type { SeriesDigestIndexEntry } from '../../shared/tools/series';
import type { Strings } from '../../shared/i18n/strings';
import type { ServerActiveInfo } from '../../shared/bridge/digest';

const server: ServerActiveInfo = {
  groupId: 'g1', groupName: 'g', providerId: 'kavita', urlId: 'u1',
  url: 'https://x.invalid', timeoutMs: 5000, priority: 0,
};

function serie(over: Partial<Serie> = {}): Serie {
  return {
    id: 's1',
    name: 'Series One',
    coverImage: { url: 'cover/s1', hasFetchedDimensions: false, resolvedAtEpochMs: 1, server, cache: null },
    chapters: [],
    pages: { read: 0, total: 100 },
    resolvedAtEpochMs: 1,
    server,
    ...over,
  };
}

function match(over: Partial<ExternalMetadataMatch> = {}): ExternalMetadataMatch {
  return { seriesId: 's1', status: 'ongoing', downloadedChapters: 12, totalChapters: 40, hasErrors: false, ...over };
}

const t = {
  publicationOngoing: 'Em andamento',
  publicationCompleted: 'Completo',
  publicationCancelled: 'Cancelado',
  publicationOnHiatus: 'Hiato',
  publicationAbandoned: 'Abandonado',
  readStatusUnread: 'Não lido',
  readStatusReading: 'Lendo',
  readStatusRead: 'Lido',
} as Strings;

function one(args: {
  serie?: Serie;
  match?: ExternalMetadataMatch | null;
  index?: SeriesDigestIndexEntry | null;
  isFollowed?: boolean;
}) {
  return LibraryTool.normalize({
    series: [args.serie ?? serie()],
    matches: [args.match ?? null],
    indexBySeriesId: args.index ? new Map([['s1', args.index]]) : new Map(),
    followedIds: new Set(args.isFollowed ? ['s1'] : []),
  })[0];
}

describe('normalizePublicationStatus', () => {
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
    expect(normalizePublicationStatus(raw)).toBe(expected);
  });

  it('undefined for unknown / empty / undefined', () => {
    expect(normalizePublicationStatus('weird')).toBeUndefined();
    expect(normalizePublicationStatus('')).toBeUndefined();
    expect(normalizePublicationStatus(undefined)).toBeUndefined();
  });
});

describe('LibraryTool.label', () => {
  it('publication covers every status', () => {
    expect(LibraryTool.label.publication('ONGOING', t)).toBe('Em andamento');
    expect(LibraryTool.label.publication('COMPLETED', t)).toBe('Completo');
    expect(LibraryTool.label.publication('CANCELLED', t)).toBe('Cancelado');
    expect(LibraryTool.label.publication('ON_HIATUS', t)).toBe('Hiato');
    expect(LibraryTool.label.publication('ABANDONED', t)).toBe('Abandonado');
  });

  it('readStatus covers every status', () => {
    expect(LibraryTool.label.readStatus('UNREAD', t)).toBe('Não lido');
    expect(LibraryTool.label.readStatus('IN_PROGRESS', t)).toBe('Lendo');
    expect(LibraryTool.label.readStatus('READ', t)).toBe('Lido');
  });

  it('progressPercent rounds', () => {
    expect(LibraryTool.label.progressPercent(0.4266)).toBe('43%');
    expect(LibraryTool.label.progressPercent(0)).toBe('0%');
    expect(LibraryTool.label.progressPercent(1)).toBe('100%');
  });
});

describe('LibraryTool.normalize', () => {
  it('page-based progress when there is no index entry', () => {
    const e = one({ serie: serie({ pages: { read: 25, total: 100 } }) });
    expect(e.progressFraction).toBe(0.25);
    expect(e.readStatus).toBe('IN_PROGRESS');
    expect(e.readChapters).toBeUndefined();
    expect(e.chapterCount).toBeUndefined();
  });

  it('zero progress when pages is absent', () => {
    const e = one({ serie: serie({ pages: undefined }) });
    expect(e.progressFraction).toBe(0);
    expect(e.readStatus).toBe('UNREAD');
  });

  it('zero progress when total is 0', () => {
    const e = one({ serie: serie({ pages: { read: 0, total: 0 } }) });
    expect(e.progressFraction).toBe(0);
  });

  it('chapter-based progress when the index has counts', () => {
    const e = one({ serie: serie({ pages: { read: 90, total: 100 } }), index: { readChapters: 3, totalChapters: 12 } });
    expect(e.readChapters).toBe(3);
    expect(e.chapterCount).toBe(12);
    expect(e.progressFraction).toBeCloseTo(0.25);
    expect(e.readStatus).toBe('IN_PROGRESS');
  });

  it('READ / UNREAD at the chapter-count boundaries', () => {
    expect(one({ index: { readChapters: 12, totalChapters: 12 } }).readStatus).toBe('READ');
    expect(one({ index: { readChapters: 0, totalChapters: 12 } }).readStatus).toBe('UNREAD');
  });

  it('clamps a page fraction above 1 → READ', () => {
    const e = one({ serie: serie({ pages: { read: 250, total: 100 } }) });
    expect(e.progressFraction).toBe(1);
    expect(e.readStatus).toBe('READ');
  });

  it('pulls downloaded/total/hasErrors/publicationStatus from the BFF match', () => {
    const e = one({ match: match({ status: 'completed', downloadedChapters: 40, totalChapters: 40, hasErrors: true }) });
    expect(e.downloadedChapters).toBe(40);
    expect(e.totalChapters).toBe(40);
    expect(e.hasErrors).toBe(true);
    expect(e.publicationStatus).toBe('COMPLETED');
  });

  it('publicationStatus cascade: BFF first, then the index Kavita value, then undefined', () => {
    expect(one({ match: match({ status: 'ongoing' }), index: { publicationStatus: 'Ended' } }).publicationStatus).toBe('ONGOING');
    expect(one({ match: match({ status: 'weird' }), index: { publicationStatus: 'Ended' } }).publicationStatus).toBe('COMPLETED');
    expect(one({ match: null, index: null }).publicationStatus).toBeUndefined();
  });

  it('no BFF match → enrichment fields absent, card still composes', () => {
    const e = one({ match: null });
    expect(e.downloadedChapters).toBeUndefined();
    expect(e.hasErrors).toBeUndefined();
    expect(e.publicationStatus).toBeUndefined();
    expect(e.id).toBe('s1');
    expect(e.coverUrl).toBe('cover/s1');
  });

  it('carries isFollowed and lastChapterAddedEpochMs', () => {
    const e = one({ serie: serie({ lastUpdatesUTC: { chapterAdded: 1738555506000 } }), isFollowed: true });
    expect(e.isFollowed).toBe(true);
    expect(e.lastChapterAddedEpochMs).toBe(1738555506000);
  });

  it('maps positional matches to the right series', () => {
    const out = LibraryTool.normalize({
      series: [serie({ id: 'a' }), serie({ id: 'b' })],
      matches: [match({ seriesId: 'a', downloadedChapters: 5 }), null],
      indexBySeriesId: new Map(),
      followedIds: new Set(),
    });
    expect(out[0].downloadedChapters).toBe(5);
    expect(out[1].downloadedChapters).toBeUndefined();
  });
});
