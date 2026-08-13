import { Chapter } from '../../../shared/bridge/series';
import { getStrings } from '../../../shared/i18n/strings';
import { actionButtonLabel } from '../SeriesDetailTransform';

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
