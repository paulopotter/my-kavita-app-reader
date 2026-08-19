import { Chapter } from '../../../shared/bridge/series';
import { getStrings } from '../../../shared/i18n/strings';
import { chapterHeaderTitle, offlineBannerVisible, progressBarFraction } from '../ReaderTransform';

const t = getStrings('pt-BR');

function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: '1',
    seriesId: '10',
    title: 'A Chegada',
    number: '1',
    pageCount: 20,
    sortOrder: 1,
    readStatus: 'UNREAD',
    pagesRead: 0,
    updatedAtLocalMs: null,
    ...overrides,
  };
}

describe('progressBarFraction', () => {
  it('repassa a fracao continua calculada no Kotlin', () => {
    expect(progressBarFraction(0.3)).toBeCloseTo(0.3);
  });

  it('clampa em 1 quando o resultado ultrapassa o total', () => {
    expect(progressBarFraction(1.5)).toBe(1);
  });

  it('clampa em 0 para valores negativos', () => {
    expect(progressBarFraction(-1)).toBe(0);
  });
});

describe('chapterHeaderTitle', () => {
  it('delega para chapterDisplayTitle sem logica duplicada', () => {
    const chapter = makeChapter({ number: '5', title: 'A Chegada' });
    expect(chapterHeaderTitle(chapter, t)).toBe('5. A Chegada');
  });
});

describe('offlineBannerVisible', () => {
  it('reflete o estado offline diretamente', () => {
    expect(offlineBannerVisible(true)).toBe(true);
    expect(offlineBannerVisible(false)).toBe(false);
  });
});
