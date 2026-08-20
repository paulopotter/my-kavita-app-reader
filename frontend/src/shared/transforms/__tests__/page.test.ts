import { ChapterWithPages, computeGapHeight, currChapterOf, isNearChapterEdge, pagePreloadOrder, ViewerChapters } from '../page';
import { Chapter } from '../../bridge/series';

function makeChapter(id: string, pageCount: number): ChapterWithPages {
  const chapter: Chapter = {
    id,
    seriesId: 's1',
    title: `Cap ${id}`,
    number: id,
    pageCount,
    sortOrder: parseFloat(id),
    readStatus: 'UNREAD',
    pagesRead: 0,
    updatedAtLocalMs: null,
  };
  return { chapter, pages: Array.from({ length: pageCount }, (_, i) => `url-${id}-${i}`) };
}

describe('computeGapHeight', () => {
  it('soma prevFooterHeight e nextHeaderHeight', () => {
    expect(computeGapHeight(50, 80)).toBe(130);
  });

  it('nunca retorna valor negativo mesmo com entradas negativas', () => {
    expect(computeGapHeight(-10, -20)).toBe(0);
    expect(computeGapHeight(-10, 20)).toBe(20);
  });
});

describe('pagePreloadOrder', () => {
  it('janela de 7 (3+3+atual) ordenada por distância absoluta', () => {
    const result = pagePreloadOrder(10, 3, 20);

    expect(result).toEqual([10, 9, 11, 8, 12, 7, 13]);
  });

  it('clampa nos limites inferior e superior', () => {
    const result = pagePreloadOrder(0, 3, 5);

    expect(result).toEqual([0, 1, 2, 3]);
  });

  it('retorna vazio quando não há páginas', () => {
    expect(pagePreloadOrder(0, 3, 0)).toEqual([]);
  });
});

describe('isNearChapterEdge', () => {
  it('limiar de 5 páginas do fim', () => {
    expect(isNearChapterEdge(94, 100, 5)).toBe(true);
    expect(isNearChapterEdge(93, 100, 5)).toBe(false);
  });

  it('última página sempre é considerada borda', () => {
    expect(isNearChapterEdge(99, 100, 5)).toBe(true);
  });

  it('retorna falso quando não há páginas', () => {
    expect(isNearChapterEdge(0, 0, 5)).toBe(false);
  });
});

describe('currChapterOf', () => {
  it('sempre retorna viewer.curr, nunca prev ou next', () => {
    const viewer: ViewerChapters = {
      prev: makeChapter('1', 1),
      curr: makeChapter('2', 1),
      next: makeChapter('3', 1),
    };

    expect(currChapterOf(viewer)).toBe(viewer.curr);
  });
});
