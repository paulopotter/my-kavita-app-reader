const mockGet = jest.fn();
const mockPut = jest.fn();
jest.mock('../../managers/preferences', () => ({
  PreferencesManager: {
    get: (...a: unknown[]) => mockGet(...a),
    put: (...a: unknown[]) => mockPut(...a),
  },
}));

import { DEFAULT_START_SCREEN, StartScreenPrefs } from './start-screen-prefs.tool';

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue(null);
  mockPut.mockResolvedValue(undefined);
});

describe('StartScreenPrefs', () => {
  it('get returns the stored "following" choice', async () => {
    mockGet.mockResolvedValue({ value: 'following' });
    expect(await StartScreenPrefs.get()).toBe('following');
    expect(mockGet).toHaveBeenCalledWith({ key: 'startScreen', variant: 'choice' });
  });

  it('get falls back to the default when nothing is stored, the value is unknown or the read rejects', async () => {
    expect(await StartScreenPrefs.get()).toBe(DEFAULT_START_SCREEN);
    mockGet.mockResolvedValue({ value: 'bogus' });
    expect(await StartScreenPrefs.get()).toBe(DEFAULT_START_SCREEN);
    mockGet.mockRejectedValue(new Error('boom'));
    expect(await StartScreenPrefs.get()).toBe(DEFAULT_START_SCREEN);
  });

  it('set persists the choice and swallows write failures', async () => {
    await StartScreenPrefs.set('following');
    expect(mockPut).toHaveBeenCalledWith({
      key: 'startScreen',
      value: 'following',
      domain: 'startScreenPrefs',
      variant: 'choice',
    });
    mockPut.mockRejectedValue(new Error('boom'));
    await expect(StartScreenPrefs.set('dashboard')).resolves.toBeUndefined();
  });

  it('isDashboardUnlocked reads the flag, defaulting to false', async () => {
    expect(await StartScreenPrefs.isDashboardUnlocked()).toBe(false);
    mockGet.mockResolvedValue({ value: 'true' });
    expect(await StartScreenPrefs.isDashboardUnlocked()).toBe(true);
    expect(mockGet).toHaveBeenLastCalledWith({ key: 'startScreen', variant: 'dashboardUnlocked' });
    mockGet.mockRejectedValue(new Error('boom'));
    expect(await StartScreenPrefs.isDashboardUnlocked()).toBe(false);
  });

  it('unlockDashboard writes "true" and swallows write failures', async () => {
    await StartScreenPrefs.unlockDashboard();
    expect(mockPut).toHaveBeenCalledWith({
      key: 'startScreen',
      value: 'true',
      domain: 'startScreenPrefs',
      variant: 'dashboardUnlocked',
    });
    mockPut.mockRejectedValue(new Error('boom'));
    await expect(StartScreenPrefs.unlockDashboard()).resolves.toBeUndefined();
  });

  describe('resolve', () => {
    const base = { startScreen: 'dashboard' as const, hasFollowedSeries: true, dashboardUnlocked: true };
    it('opens the dashboard only when chosen and unlocked', () => {
      expect(StartScreenPrefs.resolve(base)).toBe('dashboard');
      expect(StartScreenPrefs.resolve({ ...base, dashboardUnlocked: false })).toBe('library');
    });
    it('opens following only when chosen and there are followed series', () => {
      expect(StartScreenPrefs.resolve({ ...base, startScreen: 'following' })).toBe('following');
      expect(StartScreenPrefs.resolve({ ...base, startScreen: 'following', hasFollowedSeries: false })).toBe('library');
    });
  });
});
