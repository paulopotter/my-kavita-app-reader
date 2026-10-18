import type { SerialDigestSuccess } from '../../bridge';
import { adjacentChapterId, neighborsOfIn, toOrderedChapters } from './chapters-order.tool';
import type { OrderedChapter } from './chapters-order.tool';

function order(ids: string[]): OrderedChapter[] {
  return ids.map(id => ({ id, seriesId: 's1', title: id, readStatus: 'UNREAD' as const }));
}

describe('toOrderedChapters', () => {
  it('sorts successful chapters ascending by number, dropping failures', () => {
    const digest = {
      chapters: {
        list: [
          { isSuccess: true, id: 'c3', seriesId: 's1', number: 3, title: '3', readStatus: 'UNREAD' },
          { isSuccess: false, error: { code: 'x', message: 'y' } },
          { isSuccess: true, id: 'c1', seriesId: 's1', number: 1, title: '1', readStatus: 'READ' },
        ],
      },
    } as unknown as SerialDigestSuccess;
    expect(toOrderedChapters(digest).map(c => c.id)).toEqual(['c1', 'c3']);
  });

  it('orders by decimalNumber when there is no whole number (volume 1.2 sits between 1 and 4)', () => {
    const digest = {
      chapters: {
        list: [
          { isSuccess: true, id: 'v4', seriesId: 's1', number: 4, decimalNumber: 4, title: 'Capítulo 4', readStatus: 'UNREAD' },
          { isSuccess: true, id: 'v12', seriesId: 's1', decimalNumber: 1.2, title: 'Capítulo 1.2', readStatus: 'UNREAD' },
          { isSuccess: true, id: 'v1', seriesId: 's1', number: 1, decimalNumber: 1, title: 'Capítulo 1', readStatus: 'UNREAD' },
        ],
      },
    } as unknown as SerialDigestSuccess;
    expect(toOrderedChapters(digest).map(c => c.id)).toEqual(['v1', 'v12', 'v4']);
  });

  it('orders a chapter with a number before one without, then falls back to title compare', () => {
    const digest = {
      chapters: {
        list: [
          { isSuccess: true, id: 'z', seriesId: 's1', title: 'Zeta', readStatus: 'UNREAD' },
          { isSuccess: true, id: 'a', seriesId: 's1', title: 'Alpha', readStatus: 'UNREAD' },
          { isSuccess: true, id: 'n', seriesId: 's1', number: 2, title: 'Numbered', readStatus: 'UNREAD' },
        ],
      },
    } as unknown as SerialDigestSuccess;
    expect(toOrderedChapters(digest).map(c => c.id)).toEqual(['n', 'a', 'z']);
  });

  it('is empty for a series with no chapters block', () => {
    expect(toOrderedChapters({} as unknown as SerialDigestSuccess)).toEqual([]);
  });
});

describe('neighborsOfIn', () => {
  const list = order(['a', 'b', 'c']);
  it('returns both neighbours in the middle and null at the ends', () => {
    expect(neighborsOfIn(list, 'b')).toEqual({ prevId: 'a', nextId: 'c' });
    expect(neighborsOfIn(list, 'a')).toEqual({ prevId: null, nextId: 'b' });
    expect(neighborsOfIn(list, 'c')).toEqual({ prevId: 'b', nextId: null });
  });
  it('returns null/null for an unknown id', () => {
    expect(neighborsOfIn(list, 'zzz')).toEqual({ prevId: null, nextId: null });
  });
});

describe('adjacentChapterId', () => {
  const list = order(['c1', 'c2', 'c3']);
  it('finds the neighbour in both directions and null past the ends or when unknown', () => {
    expect(adjacentChapterId(list, 'c2', 'next')).toBe('c3');
    expect(adjacentChapterId(list, 'c2', 'prev')).toBe('c1');
    expect(adjacentChapterId(list, 'c3', 'next')).toBeNull();
    expect(adjacentChapterId(list, 'c1', 'prev')).toBeNull();
    expect(adjacentChapterId(list, 'zzz', 'next')).toBeNull();
    expect(adjacentChapterId([], 'c1', 'next')).toBeNull();
  });
});
