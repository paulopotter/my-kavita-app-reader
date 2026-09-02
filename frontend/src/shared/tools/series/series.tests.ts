import { SeriesTool } from './series.tool';
import type { SerialData } from '../../bridge/server';
import type { ServerActiveInfo } from '../../bridge/digest';

const server: ServerActiveInfo = {
  groupId: 'g1', groupName: 'g', providerId: 'kavita', urlId: 'u1',
  url: 'https://x.invalid', timeoutMs: 5000, priority: 0,
};

function serial(over: Partial<SerialData> = {}): SerialData {
  return {
    id: 's1',
    name: 'Series One',
    coverImage: { url: 'cover/s1', hasFetchedDimensions: false, resolvedAtEpochMs: 42, server, cache: null },
    pagesRead: 30,
    totalPages: 100,
    ...over,
  };
}

describe('SeriesTool.normalize', () => {
  it('maps SerialData[] to the canonical Serie[] shape', () => {
    const [s] = SeriesTool.normalize({ serials: [serial()] });
    expect(s.id).toBe('s1');
    expect(s.name).toBe('Series One');
    expect(s.coverImage.url).toBe('cover/s1');
    expect(s.resolvedAtEpochMs).toBe(42);
    expect(s.server).toBe(server);
  });

  it('carries page progress under Serie.pages (the batch listing has no per-chapter data)', () => {
    const [s] = SeriesTool.normalize({ serials: [serial({ pagesRead: 25, totalPages: 100 })] });
    expect(s.pages).toEqual({ read: 25, total: 100 });
    expect(s.chapters).toEqual([]);
  });

  it('leaves digest-only fields absent', () => {
    const [s] = SeriesTool.normalize({ serials: [serial()] });
    expect(s.resumePoint).toBeUndefined();
    expect(s.metadata).toBeUndefined();
  });

  it('converts lastChapterAddedUtc (ISO) to lastUpdatesUTC.chapterAdded (epoch ms)', () => {
    const iso = '2026-02-03T04:05:06Z';
    const [s] = SeriesTool.normalize({ serials: [serial({ lastChapterAddedUtc: iso })] });
    expect(s.lastUpdatesUTC?.chapterAdded).toBe(Date.parse(iso));
  });

  it('leaves lastUpdatesUTC undefined when no timestamp fields are present', () => {
    const [s] = SeriesTool.normalize({ serials: [serial()] });
    expect(s.lastUpdatesUTC).toBeUndefined();
  });

  it('ignores an unparseable timestamp', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const [s] = SeriesTool.normalize({ serials: [serial({ lastChapterAddedUtc: 'not-a-date' })] });
    expect(s.lastUpdatesUTC).toBeUndefined();
    warn.mockRestore();
  });

  it('builds library / otherNames / otherIds / colors only when a field is present', () => {
    const [bare] = SeriesTool.normalize({ serials: [serial()] });
    expect(bare.library).toBeUndefined();
    expect(bare.otherNames).toBeUndefined();
    expect(bare.otherIds).toBeUndefined();
    expect(bare.colors).toBeUndefined();

    const [rich] = SeriesTool.normalize({
      serials: [
        serial({
          libraryId: 'lib-1',
          libraryName: 'Manga',
          originalName: '原題',
          aniListId: 111,
          primaryColor: '#abc',
        }),
      ],
    });
    expect(rich.library).toEqual({ id: 'lib-1', name: 'Manga' });
    expect(rich.otherNames).toEqual({ original: '原題', localized: undefined });
    expect(rich.otherIds).toEqual({ aniListId: 111, malId: undefined });
    expect(rich.colors).toEqual({ primary: '#abc', secondary: undefined });
  });

  it('maps a whole list', () => {
    const out = SeriesTool.normalize({ serials: [serial({ id: 'a' }), serial({ id: 'b' })] });
    expect(out.map(s => s.id)).toEqual(['a', 'b']);
  });
});
