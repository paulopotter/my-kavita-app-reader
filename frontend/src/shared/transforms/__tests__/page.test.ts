import {
  buildReaderList,
  ChapterWithPages,
  computeGapHeight,
  currChapterOf,
  isNearChapterEdge,
  pagePreloadOrder,
  reindexAfterPrevInsert,
  ViewerChapters,
} from '../page';
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

describe('buildReaderList', () => {
  it('gera apenas Header, páginas e Footer quando só há capítulo atual', () => {
    const viewer: ViewerChapters = { prev: null, curr: makeChapter('1', 2), next: null };

    const items = buildReaderList(viewer, new Map());

    expect(items.map(i => i.kind)).toEqual(['HEADER', 'PAGE', 'PAGE', 'FOOTER']);
  });

  it('insere Gap apenas entre dois blocos, nunca antes do primeiro nem depois do último', () => {
    const viewer: ViewerChapters = {
      prev: makeChapter('1', 1),
      curr: makeChapter('2', 1),
      next: makeChapter('3', 1),
    };

    const items = buildReaderList(viewer, new Map());
    const kinds = items.map(i => i.kind);

    expect(kinds[0]).toBe('HEADER');
    expect(kinds[kinds.length - 1]).toBe('FOOTER');
    expect(kinds.filter(k => k === 'GAP')).toHaveLength(2);
    // Gap aparece exatamente entre FOOTER de um bloco e HEADER do próximo.
    const gapIndexes = kinds.reduce<number[]>((acc, k, i) => (k === 'GAP' ? [...acc, i] : acc), []);
    gapIndexes.forEach(i => {
      expect(kinds[i - 1]).toBe('FOOTER');
      expect(kinds[i + 1]).toBe('HEADER');
    });
  });

  it('gera chaves estáveis por identidade lógica ao remontar o mesmo capítulo', () => {
    const viewer: ViewerChapters = { prev: null, curr: makeChapter('1', 2), next: null };

    const first = buildReaderList(viewer, new Map());
    const second = buildReaderList(viewer, new Map());

    expect(first.map(i => i.key)).toEqual(second.map(i => i.key));
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

describe('reindexAfterPrevInsert', () => {
  it('desloca o índice pelo tamanho do bloco inserido', () => {
    expect(reindexAfterPrevInsert(5, 12)).toBe(17);
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
