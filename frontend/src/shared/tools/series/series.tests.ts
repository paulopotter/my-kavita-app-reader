import { SeriesTool } from './series.tool';
import type { SerialDigest, SerialDigestSuccess, ServerActiveInfo } from '../../bridge/digest';

const server: ServerActiveInfo = {
  groupId: 'g1', groupName: 'g', providerId: 'kavita', urlId: 'u1',
  url: 'https://x.invalid', timeoutMs: 5000, priority: 0,
};

// A minimal SerialDigestSuccess, the exact shape buildSerialsDigest produces per list row —
// chapters/metadata/resumePoint absent, pages present.
function digest(over: Partial<SerialDigestSuccess> = {}): SerialDigestSuccess {
  return {
    isSuccess: true,
    id: 's1',
    name: 'Series One',
    coverImage: { url: 'cover/s1', hasFetchedDimensions: false, resolvedAtEpochMs: 42, server, cache: null },
    pages: { read: 30, total: 100 },
    resolvedAtEpochMs: 42,
    server,
    cache: null,
    ...over,
  };
}

describe('SeriesTool.normalize', () => {
  it('delegates each digest to SerieTool.normalize — canonical Serie[] shape', () => {
    const [s] = SeriesTool.normalize({ serials: [digest()] });
    expect(s.id).toBe('s1');
    expect(s.name).toBe('Series One');
    expect(s.coverImage.url).toBe('cover/s1');
    expect(s.resolvedAtEpochMs).toBe(42);
    expect(s.server).toBe(server);
  });

  it('carries the list-row page progress under Serie.pages', () => {
    const [s] = SeriesTool.normalize({ serials: [digest({ pages: { read: 25, total: 100 } })] });
    expect(s.pages).toEqual({ read: 25, total: 100 });
    expect(s.chapters).toEqual([]);
  });

  it('leaves digest-only fields absent for a minimal list row', () => {
    const [s] = SeriesTool.normalize({ serials: [digest()] });
    expect(s.resumePoint).toBeUndefined();
    expect(s.metadata).toBeUndefined();
  });

  it('carries lastUpdatesUTC straight through from the digest', () => {
    const [s] = SeriesTool.normalize({
      serials: [digest({ lastUpdatesUTC: { series: undefined, chapterAdded: 1_700_000_000_000, readDate: undefined } })],
    });
    expect(s.lastUpdatesUTC?.chapterAdded).toBe(1_700_000_000_000);
  });

  it('drops a Failure entry instead of surfacing it', () => {
    const failure: SerialDigest = { isSuccess: false, error: { code: 'X', message: 'boom' } };
    const out = SeriesTool.normalize({ serials: [digest({ id: 'a' }), failure, digest({ id: 'b' })] });
    expect(out.map(s => s.id)).toEqual(['a', 'b']);
  });

  it('maps a whole list', () => {
    const out = SeriesTool.normalize({ serials: [digest({ id: 'a' }), digest({ id: 'b' })] });
    expect(out.map(s => s.id)).toEqual(['a', 'b']);
  });
});
