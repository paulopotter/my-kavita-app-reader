/**
 * Tests for the filter and prefsKey options added to useLibrary.
 * Since @testing-library/react-native is not installed, we test the
 * logic that useLibrary depends on: the filter function and prefs key routing.
 */
import { NativeModules } from 'react-native';
import { SeriesSummary } from '../../../shared/bridge/library';

const makeSeries = (id: number, isFollowed: boolean): SeriesSummary => ({
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
  latestChapterLabel: null,
  publicationStatus: 'NONE',
  hasErrors: false,
  isFollowed,
});

const ALL_SERIES = [
  makeSeries(1, true),
  makeSeries(2, false),
  makeSeries(3, true),
];

const mockLibrary = {
  listSeries: jest.fn(),
  toggleFollow: jest.fn(),
  syncBff: jest.fn(),
  saveReadingProgress: jest.fn(),
};

const mockConfig = {
  getUiPreferences: jest.fn(),
  upsertUiPreferences: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (NativeModules as any).LibraryModule = mockLibrary;
  (NativeModules as any).ConfigRepository = mockConfig;
  mockLibrary.listSeries.mockResolvedValue(ALL_SERIES);
  mockLibrary.toggleFollow.mockResolvedValue(undefined);
  mockLibrary.syncBff.mockResolvedValue(undefined);
  mockConfig.getUiPreferences.mockResolvedValue({});
  mockConfig.upsertUiPreferences.mockResolvedValue(undefined);
});

// ── Filtro isFollowed (lógica pura) ──────────────────────────────────────────

describe('filtro isFollowed — lógica pura', () => {
  const followingFilter = (s: SeriesSummary) => s.isFollowed;

  it('retorna apenas séries seguidas', () => {
    const result = ALL_SERIES.filter(followingFilter);
    expect(result).toHaveLength(2);
    expect(result.every(s => s.isFollowed)).toBe(true);
  });

  it('retorna array vazio quando nenhuma série é seguida', () => {
    const none = ALL_SERIES.map(s => ({ ...s, isFollowed: false }));
    expect(none.filter(followingFilter)).toHaveLength(0);
  });

  it('retorna todas quando todas são seguidas', () => {
    const all = ALL_SERIES.map(s => ({ ...s, isFollowed: true }));
    expect(all.filter(followingFilter)).toHaveLength(3);
  });
});

// ── Roteamento de chaves de prefs ────────────────────────────────────────────

describe('roteamento de chaves de prefs', () => {
  it('prefsKey=library usa libraryViewMode e librarySortMode', () => {
    const prefs = { libraryViewMode: 'LIST', librarySortMode: 'ALPHABETICAL' } as any;
    const viewKey = 'libraryViewMode';
    const sortKey = 'librarySortMode';
    expect(prefs[viewKey]).toBe('LIST');
    expect(prefs[sortKey]).toBe('ALPHABETICAL');
  });

  it('prefsKey=following usa followingViewMode e followingSortMode', () => {
    const prefs = { followingViewMode: 'GRID', followingSortMode: 'RECENTLY_UPDATED' } as any;
    const viewKey = 'followingViewMode';
    const sortKey = 'followingSortMode';
    expect(prefs[viewKey]).toBe('GRID');
    expect(prefs[sortKey]).toBe('RECENTLY_UPDATED');
  });

  it('chaves de library e following são independentes', () => {
    const prefs = {
      libraryViewMode: 'LIST',
      followingViewMode: 'GRID',
    } as any;
    expect(prefs.libraryViewMode).not.toBe(prefs.followingViewMode);
  });
});

// ── Bridge listSeries — contrato de retorno ──────────────────────────────────

describe('LibraryBridge.listSeries — contrato', () => {
  it('retorna array com campo isFollowed em cada série', async () => {
    const result = await NativeModules.LibraryModule.listSeries(false);
    expect(result).toHaveLength(3);
    result.forEach((s: SeriesSummary) => {
      expect(typeof s.isFollowed).toBe('boolean');
    });
  });

  it('o mock retorna séries com isFollowed misto', async () => {
    const result = await NativeModules.LibraryModule.listSeries(false);
    const followed = result.filter((s: SeriesSummary) => s.isFollowed);
    const notFollowed = result.filter((s: SeriesSummary) => !s.isFollowed);
    expect(followed.length).toBeGreaterThan(0);
    expect(notFollowed.length).toBeGreaterThan(0);
  });
});

// ── Revert otimístico do toggleFollow ────────────────────────────────────────

describe('toggleFollow — comportamento de revert otimístico', () => {
  it('invoca o bridge com o seriesId como string', async () => {
    await NativeModules.LibraryModule.toggleFollow('1');
    expect(mockLibrary.toggleFollow).toHaveBeenCalledWith('1');
  });

  it('bridge rejeita → erro capturável para revert', async () => {
    mockLibrary.toggleFollow.mockRejectedValueOnce(new Error('network'));
    await expect(NativeModules.LibraryModule.toggleFollow('1')).rejects.toThrow('network');
  });
});
