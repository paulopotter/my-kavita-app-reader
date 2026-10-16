import { PreferencesManager } from '../../managers/preferences';

// StartScreenPrefs — which tab the app opens on, plus the one-way flag that says the Dashboard
// tab exists yet. Lives in shared/tools (not in a screen) because three consumers share it: the
// Config menu writes the choice, the StartupProvider reads both at boot, and the Dashboard
// screen raises the flag the first time the user has something to show there.
//
// 'dashboard' is the code name; the user-facing label is "Home" (i18n).
//
// Both values are strings in the :preferences store (the LibraryPrefs / ReaderPrefs convention).

const DOMAIN = 'startScreenPrefs';
const KEY = 'startScreen';

export type StartScreen = 'dashboard' | 'following';
export type StartTab = 'dashboard' | 'following' | 'library';

export const DEFAULT_START_SCREEN: StartScreen = 'dashboard';

export const StartScreenPrefs = {
  get(): Promise<StartScreen> {
    return PreferencesManager.get({ key: KEY, variant: 'choice' })
      .then(entry => (entry?.value === 'following' ? 'following' : DEFAULT_START_SCREEN))
      .catch(() => DEFAULT_START_SCREEN);
  },
  set(value: StartScreen): Promise<void> {
    return PreferencesManager.put({ key: KEY, value, domain: DOMAIN, variant: 'choice' })
      .then(() => undefined)
      .catch(() => undefined);
  },
  // The Dashboard tab does not exist on a brand-new install. Once the user has read or followed
  // something it is unlocked and never locks again, even if its rails empty out later.
  isDashboardUnlocked(): Promise<boolean> {
    return PreferencesManager.get({ key: KEY, variant: 'dashboardUnlocked' })
      .then(entry => entry?.value === 'true')
      .catch(() => false);
  },
  unlockDashboard(): Promise<void> {
    return PreferencesManager.put({ key: KEY, value: 'true', domain: DOMAIN, variant: 'dashboardUnlocked' })
      .then(() => undefined)
      .catch(() => undefined);
  },
  // The tab to open on. A choice whose tab does not exist yet falls back to the Library, which
  // always exists.
  resolve({
    startScreen,
    hasFollowedSeries,
    dashboardUnlocked,
  }: {
    startScreen: StartScreen;
    hasFollowedSeries: boolean;
    dashboardUnlocked: boolean;
  }): StartTab {
    if (startScreen === 'dashboard' && dashboardUnlocked) {return 'dashboard';}
    if (startScreen === 'following' && hasFollowedSeries) {return 'following';}
    return 'library';
  },
};
