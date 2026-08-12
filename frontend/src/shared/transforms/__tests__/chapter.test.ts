import { Chapter } from '../../bridge/series';
import { chapterDisplayTitle, chapterNumberComparator, sortChapters } from '../chapter';

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

describe('chapterDisplayTitle', () => {
  it('combina numero e titulo quando ambos existem', () => {
    const chapter = makeChapter({ number: '5', title: 'A Chegada' });
    expect(chapterDisplayTitle(chapter)).toBe('Cap. 5 — A Chegada');
  });

  it('usa apenas o numero quando titulo esta vazio', () => {
    const chapter = makeChapter({ number: '5', title: '' });
    expect(chapterDisplayTitle(chapter)).toBe('Cap. 5');
  });

  it('usa apenas o titulo quando numero esta vazio', () => {
    const chapter = makeChapter({ number: '', title: 'Especial' });
    expect(chapterDisplayTitle(chapter)).toBe('Especial');
  });

  it('retorna fallback quando numero e titulo estao vazios', () => {
    const chapter = makeChapter({ number: '', title: '' });
    expect(chapterDisplayTitle(chapter)).toBe('Sem título');
  });
});

describe('chapterNumberComparator', () => {
  it('nao usa sortOrder para comparar', () => {
    const a = makeChapter({ number: '1', sortOrder: 99 });
    const b = makeChapter({ number: '2', sortOrder: 1 });
    expect(chapterNumberComparator(a, b)).toBeLessThan(0);
  });

  it('ordena numericamente, nao lexicograficamente', () => {
    const a = makeChapter({ number: '2' });
    const b = makeChapter({ number: '10' });
    expect(chapterNumberComparator(a, b)).toBeLessThan(0);
  });
});

describe('sortChapters', () => {
  const chapters: Chapter[] = [
    makeChapter({ id: '1', number: '1', readStatus: 'READ', pagesRead: 20, pageCount: 20 }),
    makeChapter({ id: '2', number: '2', readStatus: 'READ', pagesRead: 20, pageCount: 20 }),
    makeChapter({ id: '3', number: '3', readStatus: 'UNREAD', pagesRead: 0, pageCount: 20 }),
  ];

  it('ASCENDING ordena do menor para o maior numero', () => {
    const result = sortChapters(chapters, 'ASCENDING');
    expect(result.map(c => c.number)).toEqual(['1', '2', '3']);
  });

  it('DESCENDING ordena do maior para o menor numero', () => {
    const result = sortChapters(chapters, 'DESCENDING');
    expect(result.map(c => c.number)).toEqual(['3', '2', '1']);
  });

  it('AUTO_FIXED usa ordem ascendente quando ha nao-lido a partir do limiar', () => {
    const result = sortChapters(chapters, 'AUTO_FIXED', 2);
    expect(result.map(c => c.number)).toEqual(['1', '2', '3']);
  });

  it('AUTO_FIXED usa ordem descendente quando tudo a partir do limiar esta lido', () => {
    const allRead: Chapter[] = [
      makeChapter({ id: '1', number: '1', readStatus: 'READ', pagesRead: 20, pageCount: 20 }),
      makeChapter({ id: '2', number: '2', readStatus: 'READ', pagesRead: 20, pageCount: 20 }),
    ];
    const result = sortChapters(allRead, 'AUTO_FIXED', 1);
    expect(result.map(c => c.number)).toEqual(['2', '1']);
  });

  it('AUTO_PROGRESS usa ordem ascendente quando progresso esta abaixo do limiar', () => {
    const result = sortChapters(chapters, 'AUTO_PROGRESS', undefined, 90);
    expect(result.map(c => c.number)).toEqual(['1', '2', '3']);
  });

  it('AUTO_PROGRESS usa ordem descendente quando progresso atinge o limiar', () => {
    const mostlyRead: Chapter[] = [
      makeChapter({ id: '1', number: '1', readStatus: 'READ', pagesRead: 20, pageCount: 20 }),
      makeChapter({ id: '2', number: '2', readStatus: 'READ', pagesRead: 20, pageCount: 20 }),
    ];
    const result = sortChapters(mostlyRead, 'AUTO_PROGRESS', undefined, 50);
    expect(result.map(c => c.number)).toEqual(['2', '1']);
  });
});
