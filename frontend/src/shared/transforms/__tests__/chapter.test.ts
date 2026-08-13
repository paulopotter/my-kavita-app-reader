import { Chapter } from '../../bridge/series';
import { LocalProgress } from '../../bridge/chapter';
import { getStrings } from '../../i18n/strings';
import {
  chapterDisplayTitle,
  chapterNumberComparator,
  isChapterEffectivelyRead,
  resolveInitialPage,
  shouldUnmarkOnReread,
  sortChapters,
} from '../chapter';

const t = getStrings('pt-BR');

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
  it('combina numero e titulo quando titulo e real (diferente do numero)', () => {
    const chapter = makeChapter({ number: '5', title: 'A Chegada' });
    expect(chapterDisplayTitle(chapter, t)).toBe('5. A Chegada');
  });

  it('usa "Capitulo N" quando titulo esta vazio', () => {
    const chapter = makeChapter({ number: '5', title: '' });
    expect(chapterDisplayTitle(chapter, t)).toBe('Capítulo 5');
  });

  it('usa "Capitulo N" quando titulo e igual ao numero (redundante)', () => {
    const chapter = makeChapter({ number: '5', title: '5' });
    expect(chapterDisplayTitle(chapter, t)).toBe('Capítulo 5');
  });

  it('usa apenas o titulo quando numero esta vazio', () => {
    const chapter = makeChapter({ number: '', title: 'Especial' });
    expect(chapterDisplayTitle(chapter, t)).toBe('Especial');
  });

  it('retorna fallback quando numero e titulo estao vazios', () => {
    const chapter = makeChapter({ number: '', title: '' });
    expect(chapterDisplayTitle(chapter, t)).toBe('Sem título');
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

  it('AUTO_FIXED usa ordem ascendente quando ultimo lido esta no limiar ou abaixo', () => {
    const result = sortChapters(chapters, 'AUTO_FIXED', 2);
    expect(result.map(c => c.number)).toEqual(['1', '2', '3']);
  });

  it('AUTO_FIXED usa ordem descendente quando ultimo lido passou do limiar', () => {
    const readPast: Chapter[] = [
      makeChapter({ id: '1', number: '1', readStatus: 'READ' }),
      makeChapter({ id: '2', number: '2', readStatus: 'READ' }),
      makeChapter({ id: '3', number: '3', readStatus: 'UNREAD' }),
    ];
    const result = sortChapters(readPast, 'AUTO_FIXED', 1);
    expect(result.map(c => c.number)).toEqual(['3', '2', '1']);
  });

  it('AUTO_FIXED usa ordem ascendente quando nenhum capitulo foi lido', () => {
    const noneRead: Chapter[] = [
      makeChapter({ id: '1', number: '1', readStatus: 'UNREAD' }),
      makeChapter({ id: '2', number: '2', readStatus: 'UNREAD' }),
    ];
    const result = sortChapters(noneRead, 'AUTO_FIXED', 0);
    expect(result.map(c => c.number)).toEqual(['1', '2']);
  });

  it('AUTO_FIXED usa ordem ascendente quando fixedThreshold esta ausente', () => {
    const result = sortChapters(chapters, 'AUTO_FIXED', undefined);
    expect(result.map(c => c.number)).toEqual(['1', '2', '3']);
  });

  it('AUTO_PROGRESS usa ordem ascendente quando progresso esta abaixo do limiar', () => {
    const result = sortChapters(chapters, 'AUTO_PROGRESS', undefined, 90);
    expect(result.map(c => c.number)).toEqual(['1', '2', '3']);
  });

  it('AUTO_PROGRESS usa ordem descendente quando progresso atinge exatamente o limiar', () => {
    const mostlyRead: Chapter[] = [
      makeChapter({ id: '1', number: '1', readStatus: 'READ' }),
      makeChapter({ id: '2', number: '2', readStatus: 'READ' }),
    ];
    const result = sortChapters(mostlyRead, 'AUTO_PROGRESS', undefined, 100);
    expect(result.map(c => c.number)).toEqual(['2', '1']);
  });

  it('AUTO_PROGRESS usa ordem descendente quando progresso ultrapassa o limiar', () => {
    const mostlyRead: Chapter[] = [
      makeChapter({ id: '1', number: '1', readStatus: 'READ' }),
      makeChapter({ id: '2', number: '2', readStatus: 'READ' }),
    ];
    const result = sortChapters(mostlyRead, 'AUTO_PROGRESS', undefined, 50);
    expect(result.map(c => c.number)).toEqual(['2', '1']);
  });
});

describe('isChapterEffectivelyRead', () => {
  it('retorna true quando readStatus e READ', () => {
    expect(isChapterEffectivelyRead(makeChapter({ readStatus: 'READ', pagesRead: 0, pageCount: 20 }))).toBe(true);
  });

  it('retorna true quando pagesRead/pageCount atinge o limiar de 98%', () => {
    expect(isChapterEffectivelyRead(makeChapter({ readStatus: 'IN_PROGRESS', pagesRead: 49, pageCount: 50 }))).toBe(
      true,
    );
  });

  it('retorna false quando abaixo do limiar', () => {
    expect(isChapterEffectivelyRead(makeChapter({ readStatus: 'IN_PROGRESS', pagesRead: 48, pageCount: 50 }))).toBe(
      false,
    );
  });

  it('retorna false quando pageCount e zero', () => {
    expect(isChapterEffectivelyRead(makeChapter({ readStatus: 'UNREAD', pagesRead: 0, pageCount: 0 }))).toBe(false);
  });
});

describe('resolveInitialPage', () => {
  it('capitulo efetivamente lido sempre reabre do inicio, mesmo com progresso salvo', () => {
    const chapter = makeChapter({ readStatus: 'READ', pagesRead: 20, pageCount: 20 });
    const local: LocalProgress = { page: 10, scrollFraction: 0.5 };

    expect(resolveInitialPage(chapter, local, 15)).toEqual({ page: 0, scrollFraction: 0 });
  });

  it('usa progresso local antes do servidor quando nao lido', () => {
    const chapter = makeChapter({ readStatus: 'UNREAD', pagesRead: 0, pageCount: 20 });
    const local: LocalProgress = { page: 5, scrollFraction: 0.25 };

    expect(resolveInitialPage(chapter, local, 15)).toEqual({ page: 5, scrollFraction: 0.25 });
  });

  it('usa progresso do servidor quando nao ha local', () => {
    const chapter = makeChapter({ readStatus: 'UNREAD', pagesRead: 0, pageCount: 20 });

    expect(resolveInitialPage(chapter, null, 8)).toEqual({ page: 8, scrollFraction: 0 });
  });

  it('usa pagina 0 quando nao ha local nem servidor', () => {
    const chapter = makeChapter({ readStatus: 'UNREAD', pagesRead: 0, pageCount: 20 });

    expect(resolveInitialPage(chapter, null, null)).toEqual({ page: 0, scrollFraction: 0 });
  });
});

describe('shouldUnmarkOnReread', () => {
  it('nao desmarca se nao estava lido ao abrir', () => {
    expect(shouldUnmarkOnReread(false, 5, 20, false)).toBe(false);
  });

  it('nao desmarca se ja foi desmarcado nesta sessao', () => {
    expect(shouldUnmarkOnReread(true, 5, 20, true)).toBe(false);
  });

  it('nao desmarca na ultima pagina', () => {
    expect(shouldUnmarkOnReread(true, 19, 20, false)).toBe(false);
  });

  it('desmarca quando estava lido, rolou para pagina intermediaria e ainda nao desmarcou', () => {
    expect(shouldUnmarkOnReread(true, 5, 20, false)).toBe(true);
  });
});
