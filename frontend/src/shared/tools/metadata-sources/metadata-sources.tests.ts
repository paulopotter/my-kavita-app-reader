import { DEFAULT_METADATA_SOURCE_PREFERENCES, MetadataSourcesTool, type MetadataSourcePreferences } from './metadata-sources.tool';
import { PreferencesManager } from '../../managers/preferences';

jest.mock('../../managers/preferences', () => ({
  PreferencesManager: { get: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const mockedPreferences = PreferencesManager as jest.Mocked<typeof PreferencesManager>;

function prefs(over: Partial<MetadataSourcePreferences> = {}): MetadataSourcePreferences {
  return { ...DEFAULT_METADATA_SOURCE_PREFERENCES, ...over };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedPreferences.get.mockResolvedValue(null);
  mockedPreferences.put.mockResolvedValue({} as never);
  mockedPreferences.delete.mockResolvedValue(undefined);
});

describe('sourceFor', () => {
  it('falls back to the global when the field has no choice of its own', () => {
    expect(MetadataSourcesTool.sourceFor({ field: 'summary', preferences: prefs({ global: 'content' }) })).toBe('content');
  });

  it("lets a field's own choice win over the global", () => {
    const preferences = prefs({ global: 'enrichment', fields: { genres: 'content' } });
    expect(MetadataSourcesTool.sourceFor({ field: 'genres', preferences })).toBe('content');
    // The global still rules every other field.
    expect(MetadataSourcesTool.sourceFor({ field: 'summary', preferences })).toBe('enrichment');
  });
});

describe('resolve', () => {
  it('prefers the enrichment server by default', () => {
    const value = MetadataSourcesTool.resolve({
      field: 'summary',
      preferences: prefs(),
      fromEnrichment: 'from enrichment',
      fromContent: 'from content',
    });
    expect(value).toBe('from enrichment');
  });

  it('falls back to the other server when the preferred one has nothing', () => {
    const value = MetadataSourcesTool.resolve({
      field: 'summary',
      preferences: prefs(),
      fromEnrichment: undefined,
      fromContent: 'from content',
    });
    expect(value).toBe('from content');
  });

  // The case the user asked about directly: global on one server, one field pinned to the other.
  it('honours a per-field override against the global, still falling back when it is empty', () => {
    const preferences = prefs({ global: 'enrichment', fields: { genres: 'content' } });

    expect(
      MetadataSourcesTool.resolve({ field: 'genres', preferences, fromEnrichment: ['a'], fromContent: ['b'] }),
    ).toEqual(['b']);
    expect(
      MetadataSourcesTool.resolve({ field: 'genres', preferences, fromEnrichment: ['a'], fromContent: [] }),
    ).toEqual(['a']);
  });

  it('treats an empty string or empty list as no answer, not as an answer', () => {
    expect(
      MetadataSourcesTool.resolve({ field: 'summary', preferences: prefs(), fromEnrichment: '   ', fromContent: 'real' }),
    ).toBe('real');
    expect(
      MetadataSourcesTool.resolve({ field: 'genres', preferences: prefs(), fromEnrichment: [], fromContent: ['real'] }),
    ).toEqual(['real']);
  });

  it('returns undefined when neither server answered', () => {
    expect(
      MetadataSourcesTool.resolve({ field: 'author', preferences: prefs(), fromEnrichment: undefined, fromContent: undefined }),
    ).toBeUndefined();
  });

  it('keeps a falsy-but-real value instead of falling through', () => {
    // 0 is a real answer; only null/undefined/blank/empty-list count as "nothing".
    expect(
      MetadataSourcesTool.resolve({ field: 'summary', preferences: prefs(), fromEnrichment: 0, fromContent: 5 }),
    ).toBe(0);
  });
});

describe('preferences', () => {
  // PreferencesManager identifies an entry by key + variant alone — `domain` is only for bulk
  // deletion. A bare 'global' key here collided with ChaptersTool.sort's own, so saving a
  // metadata source wiped the user's chapter-sort preferences and every list fell back to
  // ascending. These keys must stay namespaced.
  it('writes under keys that cannot collide with another tool', async () => {
    await MetadataSourcesTool.preferences.putGlobal({ source: 'content' });
    await MetadataSourcesTool.preferences.putField({ field: 'genres', choice: 'content' });

    const written = mockedPreferences.put.mock.calls.map(([args]) => args.key);
    expect(written.every(key => key.startsWith('metadataSource:'))).toBe(true);
    expect(written).not.toContain('global');
  });

  it('returns the built-in default when nothing was ever saved', async () => {
    await expect(MetadataSourcesTool.preferences.get()).resolves.toEqual(DEFAULT_METADATA_SOURCE_PREFERENCES);
  });

  it('reads back what was stored', async () => {
    mockedPreferences.get.mockImplementation(({ key }) =>
      Promise.resolve(
        key === 'metadataSource:global'
          ? ({ value: JSON.stringify('content') } as never)
          : ({ value: JSON.stringify({ genres: 'enrichment' }) } as never),
      ),
    );

    await expect(MetadataSourcesTool.preferences.get()).resolves.toEqual({ global: 'content', fields: { genres: 'enrichment' } });
  });

  it('wipes every per-field choice when the global changes', async () => {
    const result = await MetadataSourcesTool.preferences.putGlobal({ source: 'content' });

    expect(mockedPreferences.delete).toHaveBeenCalledWith({ key: 'metadataSource:fields' });
    expect(result).toEqual({ global: 'content', fields: {} });
  });

  it('stores a per-field choice', async () => {
    const result = await MetadataSourcesTool.preferences.putField({ field: 'genres', choice: 'content' });

    expect(result.fields).toEqual({ genres: 'content' });
  });

  // Inheriting is the absence of a choice — storing it would freeze today's default in place.
  it('removes the entry when a field goes back to inherit', async () => {
    mockedPreferences.get.mockImplementation(({ key }) =>
      Promise.resolve(key === 'metadataSource:fields' ? ({ value: JSON.stringify({ genres: 'content' }) } as never) : null),
    );

    const result = await MetadataSourcesTool.preferences.putField({ field: 'genres', choice: 'inherit' });

    expect(result.fields).toEqual({});
  });
});
