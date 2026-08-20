import { Chapter } from '../../bridge/series';
import { computeContinueChapter } from '../series';

function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: '1',
    seriesId: '10',
    title: '',
    number: '1',
    pageCount: 20,
    sortOrder: 1,
    readStatus: 'UNREAD',
    pagesRead: 0,
    updatedAtLocalMs: null,
    ...overrides,
  };
}

describe('computeContinueChapter', () => {
  it('retorna null quando nao ha capitulos', () => {
    expect(computeContinueChapter([])).toBeNull();
  });

  it('retorna o primeiro capitulo quando nao ha nenhum progresso', () => {
    const chapters = [
      makeChapter({ id: '1', number: '1', readStatus: 'UNREAD', pagesRead: 0 }),
      makeChapter({ id: '2', number: '2', readStatus: 'UNREAD', pagesRead: 0 }),
    ];
    expect(computeContinueChapter(chapters)?.id).toBe('1');
  });

  it('retorna o capitulo em progresso quando existe um', () => {
    const chapters = [
      makeChapter({ id: '1', number: '1', readStatus: 'READ', pagesRead: 20, pageCount: 20 }),
      makeChapter({ id: '2', number: '2', readStatus: 'IN_PROGRESS', pagesRead: 5, pageCount: 20 }),
      makeChapter({ id: '3', number: '3', readStatus: 'UNREAD', pagesRead: 0 }),
    ];
    expect(computeContinueChapter(chapters)?.id).toBe('2');
  });

  it('retorna o primeiro nao lido em ordem numerica ascendente quando tudo antes esta lido', () => {
    const chapters = [
      makeChapter({ id: '1', number: '1', readStatus: 'READ', pagesRead: 20, pageCount: 20 }),
      makeChapter({ id: '2', number: '10', readStatus: 'UNREAD', pagesRead: 0 }),
      makeChapter({ id: '3', number: '2', readStatus: 'UNREAD', pagesRead: 0 }),
    ];
    expect(computeContinueChapter(chapters)?.id).toBe('3');
  });

  it('retorna null (reler) quando tudo esta lido acima de 98%', () => {
    const chapters = [
      makeChapter({ id: '1', number: '1', readStatus: 'READ', pagesRead: 20, pageCount: 20 }),
      makeChapter({ id: '2', number: '2', readStatus: 'READ', pagesRead: 20, pageCount: 20 }),
    ];
    expect(computeContinueChapter(chapters)).toBeNull();
  });
});
