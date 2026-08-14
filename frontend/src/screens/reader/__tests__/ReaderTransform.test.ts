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
  it('calcula a fracao combinando pagina e scrollFraction', () => {
    expect(progressBarFraction(2, 0.5, 10)).toBeCloseTo(0.25);
  });

  it('clampa em 1 quando o resultado ultrapassa o total', () => {
    expect(progressBarFraction(9, 0.9, 10)).toBeLessThanOrEqual(1);
    expect(progressBarFraction(20, 0, 10)).toBe(1);
  });

  it('clampa em 0 para valores negativos', () => {
    expect(progressBarFraction(-1, 0, 10)).toBe(0);
  });

  it('nao gera NaN nem Infinity quando totalPages e 0', () => {
    const result = progressBarFraction(0, 0, 0);
    expect(Number.isNaN(result)).toBe(false);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBe(0);
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
