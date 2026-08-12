import { Chapter } from '../../../shared/bridge/series';
import { getStrings } from '../../../shared/i18n/strings';
import { actionButtonLabel, parseSortConfigInput, sortModeLabel } from '../SeriesDetailTransform';

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

describe('sortModeLabel', () => {
  it('retorna label para ASCENDING', () => {
    expect(sortModeLabel('ASCENDING', undefined, 50, t)).toBe('Crescente');
  });

  it('retorna label para DESCENDING', () => {
    expect(sortModeLabel('DESCENDING', undefined, 50, t)).toBe('Decrescente');
  });

  it('retorna label com limiar para AUTO_FIXED', () => {
    expect(sortModeLabel('AUTO_FIXED', 12, 50, t)).toBe('Auto (cap. 12)');
  });

  it('retorna label com 0 quando AUTO_FIXED sem limiar definido', () => {
    expect(sortModeLabel('AUTO_FIXED', undefined, 50, t)).toBe('Auto (cap. 0)');
  });

  it('retorna label com percentual para AUTO_PROGRESS', () => {
    expect(sortModeLabel('AUTO_PROGRESS', undefined, 80, t)).toBe('Auto (80%)');
  });
});

describe('actionButtonLabel', () => {
  it('retorna "comecar a ler" quando nao ha capitulos', () => {
    expect(actionButtonLabel(null, 0, 0, t)).toBe('Começar a ler');
  });

  it('retorna "comecar a ler" quando ha capitulos mas nenhum lido', () => {
    const chapter = makeChapter({ number: '1' });
    expect(actionButtonLabel(chapter, 0, 5, t)).toBe('Começar a ler');
  });

  it('retorna "continuar lendo" com o numero do capitulo quando ha progresso', () => {
    const chapter = makeChapter({ number: '3' });
    expect(actionButtonLabel(chapter, 2, 5, t)).toBe('Continuar lendo cap. 3');
  });

  it('retorna "reler" quando todos os capitulos estao lidos (continueChapter nulo)', () => {
    expect(actionButtonLabel(null, 5, 5, t)).toBe('Reler');
  });
});

describe('parseSortConfigInput', () => {
  it('parseia limiar e percentual validos', () => {
    const result = parseSortConfigInput('12', '80', 50);
    expect(result.fixedThreshold).toBe(12);
    expect(result.progressPercent).toBe(80);
  });

  it('retorna fixedThreshold undefined quando texto vazio', () => {
    const result = parseSortConfigInput('', '80', 50);
    expect(result.fixedThreshold).toBeUndefined();
  });

  it('retorna fixedThreshold undefined quando texto invalido', () => {
    const result = parseSortConfigInput('abc', '80', 50);
    expect(result.fixedThreshold).toBeUndefined();
  });

  it('usa fallback de progressPercent quando texto invalido', () => {
    const result = parseSortConfigInput('12', 'xyz', 50);
    expect(result.progressPercent).toBe(50);
  });

  it('usa fallback de progressPercent quando texto vazio', () => {
    const result = parseSortConfigInput('12', '', 50);
    expect(result.progressPercent).toBe(50);
  });

  it('aceita limiar decimal', () => {
    const result = parseSortConfigInput('12.5', '80', 50);
    expect(result.fixedThreshold).toBe(12.5);
  });
});
