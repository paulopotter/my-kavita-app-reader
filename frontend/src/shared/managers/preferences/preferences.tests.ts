import { PreferencesManager } from './preferences.manager';

jest.mock('../../bridge/preferences', () => ({
  PreferencesBridge: {
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    deleteDomain: jest.fn(),
  },
}));

import { PreferencesBridge } from '../../bridge/preferences';

const mockGet = PreferencesBridge.get as jest.Mock;
const mockPut = PreferencesBridge.put as jest.Mock;
const mockDelete = PreferencesBridge.delete as jest.Mock;
const mockDeleteDomain = PreferencesBridge.deleteDomain as jest.Mock;

describe('PreferencesManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('get forwards key/variant to PreferencesBridge.get, defaulting variant to ""', async () => {
    mockGet.mockResolvedValue(null);
    await PreferencesManager.get({ key: 'global' });
    expect(mockGet).toHaveBeenCalledWith({ key: 'global', variant: '' });
  });

  it('get returns exactly what the bridge resolved', async () => {
    const entry = { value: '{}', updatedAtEpochMs: 1 };
    mockGet.mockResolvedValue(entry);
    const result = await PreferencesManager.get({ key: 'global', variant: 's1' });
    expect(mockGet).toHaveBeenCalledWith({ key: 'global', variant: 's1' });
    expect(result).toBe(entry);
  });

  it('put forwards every field to PreferencesBridge.put, defaulting variant to ""', async () => {
    const descriptor = { key: 'global', variant: '', domain: 'chapterSortPrefs', updatedAtEpochMs: 1 };
    mockPut.mockResolvedValue(descriptor);
    const result = await PreferencesManager.put({ key: 'global', value: '{}', domain: 'chapterSortPrefs' });
    expect(mockPut).toHaveBeenCalledWith({ key: 'global', value: '{}', domain: 'chapterSortPrefs', variant: '' });
    expect(result).toBe(descriptor);
  });

  it('put forwards an explicit variant instead of defaulting it', async () => {
    mockPut.mockResolvedValue({});
    await PreferencesManager.put({ key: 'global', value: '{}', domain: 'chapterSortPrefs', variant: 's1' });
    expect(mockPut).toHaveBeenCalledWith({ key: 'global', value: '{}', domain: 'chapterSortPrefs', variant: 's1' });
  });

  it('delete forwards key/variant, defaulting variant to ""', async () => {
    mockDelete.mockResolvedValue(undefined);
    await PreferencesManager.delete({ key: 'global' });
    expect(mockDelete).toHaveBeenCalledWith({ key: 'global', variant: '' });
  });

  it('delete forwards an explicit variant instead of defaulting it', async () => {
    mockDelete.mockResolvedValue(undefined);
    await PreferencesManager.delete({ key: 'global', variant: 's1' });
    expect(mockDelete).toHaveBeenCalledWith({ key: 'global', variant: 's1' });
  });

  it('deleteDomain forwards domain', async () => {
    mockDeleteDomain.mockResolvedValue(undefined);
    await PreferencesManager.deleteDomain({ domain: 'chapterSortPrefs' });
    expect(mockDeleteDomain).toHaveBeenCalledWith({ domain: 'chapterSortPrefs' });
  });

  describe('Methods.requireArgs guard (a caller bypassing TypeScript, e.g. plain JS or `any`)', () => {
    it('get throws instead of reaching the bridge when args is undefined', () => {
      expect(() => PreferencesManager.get(undefined as any)).toThrow('PreferencesManager.get requires { key }, got no arguments');
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('put throws naming every missing required field', () => {
      expect(() => PreferencesManager.put({ key: 'global' } as any)).toThrow(
        'PreferencesManager.put is missing required field(s): value, domain',
      );
      expect(mockPut).not.toHaveBeenCalled();
    });

    it('delete throws when key is missing', () => {
      expect(() => PreferencesManager.delete({} as any)).toThrow(
        'PreferencesManager.delete is missing required field(s): key',
      );
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('deleteDomain throws when domain is missing', () => {
      expect(() => PreferencesManager.deleteDomain({} as any)).toThrow(
        'PreferencesManager.deleteDomain is missing required field(s): domain',
      );
      expect(mockDeleteDomain).not.toHaveBeenCalled();
    });
  });
});
