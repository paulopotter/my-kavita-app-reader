/**
 * @testing-library/react-native não está instalado no projeto, então o hook
 * (efeitos, useFocusEffect, listeners) não é executado diretamente aqui.
 * Testamos o reducer exportado — a mesma função pura que orquestra todo o
 * estado do hook — cobrindo loading→loaded, marcação otimista sem reversão,
 * seleção múltipla e os 4 modos de ordenação.
 */
// O módulo nativo SeriesModule não existe no ambiente de teste (fora do app
// real) — instanciar NativeEventEmitter(undefined) lança no import-time.
// Mockamos o bridge inteiro (sem requireActual, que executaria o mesmo
// import problemático) com um stub mínimo suficiente para o hook carregar.
jest.mock('../../../shared/bridge/series', () => ({
  SeriesFollowedEmitter: { addListener: jest.fn(() => ({ remove: jest.fn() })) },
  SeriesBridge: {},
}));

import type { Chapter } from '../../../shared/bridge/series';
import { initial, reducer, State } from '../useSeriesDetail';

function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: '1',
    seriesId: '10',
    title: 'Cap',
    number: '1',
    pageCount: 20,
    sortOrder: 1,
    readStatus: 'UNREAD',
    pagesRead: 0,
    updatedAtLocalMs: null,
    ...overrides,
  };
}

describe('reducer — loading para loaded', () => {
  it('estado inicial comeca em loading', () => {
    expect(initial.loading).toBe(true);
    expect(initial.chapters).toEqual([]);
  });

  it('LOADING marca loading=true e limpa erro', () => {
    const state = reducer({ ...initial, error: 'algo' }, { type: 'LOADING' });
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('CHAPTERS_LOADED marca loading=false e popula capitulos ordenados', () => {
    const chapters = [makeChapter({ id: '2', number: '2' }), makeChapter({ id: '1', number: '1' })];
    const state = reducer(initial, {
      type: 'CHAPTERS_LOADED',
      chapters,
      sortMode: 'ASCENDING',
      progressPercent: 50,
    });
    expect(state.loading).toBe(false);
    expect(state.chapters.map(c => c.id)).toEqual(['1', '2']);
  });

  it('ERROR marca loading=false, refreshing=false e seta mensagem', () => {
    const state = reducer({ ...initial, loading: true, refreshing: true }, { type: 'ERROR', error: 'falhou' });
    expect(state.loading).toBe(false);
    expect(state.refreshing).toBe(false);
    expect(state.error).toBe('falhou');
  });
});

describe('reducer — marcacao otimista', () => {
  const baseState: State = {
    ...initial,
    loading: false,
    chapters: [makeChapter({ id: '1', number: '1', readStatus: 'UNREAD', pagesRead: 0, pageCount: 20 })],
  };

  it('UPDATE_CHAPTERS_READ_STATUS marca como READ imediatamente', () => {
    const state = reducer(baseState, {
      type: 'UPDATE_CHAPTERS_READ_STATUS',
      ids: ['1'],
      readStatus: 'READ',
      nowMs: 1000,
    });
    expect(state.chapters[0].readStatus).toBe('READ');
    expect(state.chapters[0].pagesRead).toBe(20);
    expect(state.chapters[0].updatedAtLocalMs).toBe(1000);
  });

  it('nao reverte a marcacao mesmo apos um ERROR subsequente (sync queue, nunca reversao)', () => {
    const marked = reducer(baseState, {
      type: 'UPDATE_CHAPTERS_READ_STATUS',
      ids: ['1'],
      readStatus: 'READ',
      nowMs: 1000,
    });
    const afterError = reducer(marked, { type: 'ERROR', error: 'network fail' });
    expect(afterError.chapters[0].readStatus).toBe('READ');
  });

  it('UPDATE_CHAPTERS_READ_STATUS marca como UNREAD com pagesRead zerado', () => {
    const readState: State = {
      ...baseState,
      chapters: [makeChapter({ id: '1', readStatus: 'READ', pagesRead: 20, pageCount: 20 })],
    };
    const state = reducer(readState, {
      type: 'UPDATE_CHAPTERS_READ_STATUS',
      ids: ['1'],
      readStatus: 'UNREAD',
      nowMs: 2000,
    });
    expect(state.chapters[0].readStatus).toBe('UNREAD');
    expect(state.chapters[0].pagesRead).toBe(0);
  });

  it('nao afeta capitulos fora da lista de ids', () => {
    const twoChapters: State = {
      ...baseState,
      chapters: [
        makeChapter({ id: '1', readStatus: 'UNREAD' }),
        makeChapter({ id: '2', readStatus: 'UNREAD' }),
      ],
    };
    const state = reducer(twoChapters, {
      type: 'UPDATE_CHAPTERS_READ_STATUS',
      ids: ['1'],
      readStatus: 'READ',
      nowMs: 1000,
    });
    expect(state.chapters.find(c => c.id === '2')?.readStatus).toBe('UNREAD');
  });
});

describe('reducer — selecao multipla', () => {
  const twoChapters: State = {
    ...initial,
    chapters: [makeChapter({ id: '1' }), makeChapter({ id: '2' }), makeChapter({ id: '3' })],
  };

  it('LONG_PRESS entra em modo selecao com um item selecionado', () => {
    const state = reducer(twoChapters, { type: 'LONG_PRESS', chapterId: '1' });
    expect(state.selectionMode).toBe(true);
    expect(state.selectedIds.has('1')).toBe(true);
  });

  it('CLICK em modo selecao alterna a selecao do item', () => {
    const selecting = reducer(twoChapters, { type: 'LONG_PRESS', chapterId: '1' });
    const toggled = reducer(selecting, { type: 'CLICK', chapterId: '2' });
    expect(toggled.selectedIds.has('1')).toBe(true);
    expect(toggled.selectedIds.has('2')).toBe(true);
  });

  it('CLICK fora do modo selecao nao faz nada', () => {
    const state = reducer(twoChapters, { type: 'CLICK', chapterId: '1' });
    expect(state.selectionMode).toBe(false);
    expect(state.selectedIds.size).toBe(0);
  });

  it('desselecionar o ultimo item sai do modo selecao', () => {
    const selecting = reducer(twoChapters, { type: 'LONG_PRESS', chapterId: '1' });
    const deselected = reducer(selecting, { type: 'CLICK', chapterId: '1' });
    expect(deselected.selectionMode).toBe(false);
    expect(deselected.selectedIds.size).toBe(0);
  });

  it('SELECT_ALL seleciona todos os capitulos', () => {
    const state = reducer(twoChapters, { type: 'SELECT_ALL' });
    expect(state.selectedIds.size).toBe(3);
  });

  it('INVERT_SELECTION inverte a selecao atual', () => {
    const selecting = reducer(twoChapters, { type: 'LONG_PRESS', chapterId: '1' });
    const inverted = reducer(selecting, { type: 'INVERT_SELECTION' });
    expect(inverted.selectedIds.has('1')).toBe(false);
    expect(inverted.selectedIds.has('2')).toBe(true);
    expect(inverted.selectedIds.has('3')).toBe(true);
  });

  it('EXIT_SELECTION limpa a selecao e sai do modo', () => {
    const selecting = reducer(twoChapters, { type: 'SELECT_ALL' });
    const exited = reducer(selecting, { type: 'EXIT_SELECTION' });
    expect(exited.selectionMode).toBe(false);
    expect(exited.selectedIds.size).toBe(0);
  });
});

describe('reducer — 4 modos de ordenacao', () => {
  const chapters = [
    makeChapter({ id: '1', number: '1', readStatus: 'READ', pagesRead: 20, pageCount: 20 }),
    makeChapter({ id: '2', number: '2', readStatus: 'UNREAD', pagesRead: 0 }),
  ];
  const loaded: State = { ...initial, chapters };

  it('SET_SORT_MODE ASCENDING mantem ordem crescente', () => {
    const state = reducer(loaded, { type: 'SET_SORT_MODE', mode: 'ASCENDING' });
    expect(state.chapters.map(c => c.number)).toEqual(['1', '2']);
    expect(state.sortMode).toBe('ASCENDING');
  });

  it('SET_SORT_MODE DESCENDING inverte a ordem', () => {
    const state = reducer(loaded, { type: 'SET_SORT_MODE', mode: 'DESCENDING' });
    expect(state.chapters.map(c => c.number)).toEqual(['2', '1']);
  });

  it('SET_SORT_MODE AUTO_FIXED aplica o transform com o limiar armazenado', () => {
    const withThreshold: State = { ...loaded, sortFixedThreshold: 2 };
    const state = reducer(withThreshold, { type: 'SET_SORT_MODE', mode: 'AUTO_FIXED' });
    expect(state.sortMode).toBe('AUTO_FIXED');
    expect(state.chapters).toHaveLength(2);
  });

  it('SET_SORT_MODE AUTO_PROGRESS aplica o transform com o percentual armazenado', () => {
    const withProgress: State = { ...loaded, sortProgressPercent: 90 };
    const state = reducer(withProgress, { type: 'SET_SORT_MODE', mode: 'AUTO_PROGRESS' });
    expect(state.sortMode).toBe('AUTO_PROGRESS');
    expect(state.chapters).toHaveLength(2);
  });

  it('SET_SORT_PREFS atualiza modo, limiar e percentual de uma vez', () => {
    const state = reducer(loaded, {
      type: 'SET_SORT_PREFS',
      mode: 'AUTO_FIXED',
      fixedThreshold: 5,
      progressPercent: 80,
    });
    expect(state.sortMode).toBe('AUTO_FIXED');
    expect(state.sortFixedThreshold).toBe(5);
    expect(state.sortProgressPercent).toBe(80);
  });
});

describe('reducer — seguir reativo', () => {
  it('SET_FOLLOWED atualiza isFollowed', () => {
    const state = reducer(initial, { type: 'SET_FOLLOWED', isFollowed: true });
    expect(state.isFollowed).toBe(true);
  });
});
