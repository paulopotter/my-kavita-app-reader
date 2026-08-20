// O módulo nativo SeriesModule não existe no ambiente de teste — instanciar
// NativeEventEmitter(undefined) lança no import-time. Mockamos com um stub mínimo.
jest.mock('../../../shared/bridge/series', () => ({
  SeriesFollowedEmitter: { addListener: jest.fn(() => ({ remove: jest.fn() })) },
  SeriesBridge: {},
}));

import { SeriesSummary } from '../../../shared/bridge/library';
import { reducer } from '../useLibrary';

function makeSeries(id: number, isFollowed: boolean): SeriesSummary {
  return {
    id,
    name: `Series ${id}`,
    coverUrl: '',
    readStatus: 'UNREAD',
    progressFraction: 0,
    pagesRead: 0,
    totalPages: 0,
    lastChapterAddedUtc: null,
    downloadedChapters: null,
    totalChapters: null,
    readChapters: null,
    chapterCount: null,
    latestChapterLabel: null,
    publicationStatus: 'NONE',
    hasErrors: false,
    isFollowed,
  };
}

const baseState = {
  loading: false,
  data: [makeSeries(1, true), makeSeries(2, false), makeSeries(3, true)],
  error: null,
  viewMode: 'GRID' as const,
  sortMode: 'RECENTLY_UPDATED' as const,
};

describe('reducer — SET_FOLLOWED_IDS (sincroniza follow entre telas)', () => {
  it('marca isFollowed=true apenas para os ids presentes na lista', () => {
    const state = reducer(baseState, { type: 'SET_FOLLOWED_IDS', ids: ['2'] });
    expect(state.data.find(s => s.id === 1)?.isFollowed).toBe(false);
    expect(state.data.find(s => s.id === 2)?.isFollowed).toBe(true);
    expect(state.data.find(s => s.id === 3)?.isFollowed).toBe(false);
  });

  it('lista vazia desmarca todas as séries', () => {
    const state = reducer(baseState, { type: 'SET_FOLLOWED_IDS', ids: [] });
    expect(state.data.every(s => !s.isFollowed)).toBe(true);
  });

  it('não afeta outros campos do estado', () => {
    const state = reducer(baseState, { type: 'SET_FOLLOWED_IDS', ids: ['1'] });
    expect(state.viewMode).toBe('GRID');
    expect(state.sortMode).toBe('RECENTLY_UPDATED');
    expect(state.loading).toBe(false);
  });
});

// A FollowingScreen aplica um filtro isFollowed sobre state.data (fora do reducer, em useLibrary).
// Esses testes simulam esse filtro para garantir que ele reage a mudanças de follow — o bug
// original: LOADED aplicava o filtro uma única vez no fetch, então um item recém-seguido nunca
// entrava na lista e um item desseguido nunca saía, até um refresh manual.
describe('filtro isFollowed aplicado sobre state.data (regressão FollowingScreen)', () => {
  const followingFilter = (s: SeriesSummary) => s.isFollowed;

  it('SET_FOLLOWED_IDS faz um item recém-seguido aparecer no filtro', () => {
    const state = reducer(baseState, { type: 'SET_FOLLOWED_IDS', ids: ['1', '2', '3'] });
    const filtered = state.data.filter(followingFilter);
    expect(filtered.map(s => s.id)).toEqual([1, 2, 3]);
  });

  it('SET_FOLLOWED_IDS faz um item desseguido sumir do filtro', () => {
    const state = reducer(baseState, { type: 'SET_FOLLOWED_IDS', ids: [] });
    expect(state.data.filter(followingFilter)).toHaveLength(0);
  });

  it('TOGGLE_FOLLOW também reflete no filtro imediatamente (update otimista)', () => {
    const state = reducer(baseState, { type: 'TOGGLE_FOLLOW', seriesId: 2 });
    const filtered = state.data.filter(followingFilter);
    expect(filtered.map(s => s.id)).toEqual([1, 2, 3]);
  });
});
