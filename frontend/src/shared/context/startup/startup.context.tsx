import React, { createContext, useContext, useEffect, useState } from 'react';
import { StartupBridge } from '../../bridge';
import { StartScreenPrefs } from '../../tools/startup';
import type { StartupState } from './startup.types';

const StartupContext = createContext<StartupState>({
  hasServerConfigured: false,
  hasFollowedSeries: false,
  startTab: 'library',
  dashboardUnlocked: false,
  unreadNotificationCount: 0,
  refresh: () => {},
});

export function StartupProvider({ children }: { children: React.ReactNode }) {
  const [hasServerConfigured, setHasServerConfigured] = useState(false);
  const [hasFollowedSeries, setHasFollowedSeries] = useState(false);
  const [startTab, setStartTab] = useState<StartupState['startTab']>('library');
  const [dashboardUnlocked, setDashboardUnlocked] = useState(false);
  const [unreadNotificationCount] = useState(0);

  async function load() {
    try {
      const [server, followed, startScreen, unlockedBefore] = await Promise.all([
        StartupBridge.hasServerConfigured(),
        StartupBridge.hasFollowedSeries(),
        StartScreenPrefs.get(),
        StartScreenPrefs.isDashboardUnlocked(),
      ]);
      // Following a series is consuming something: unlock the Dashboard tab for good.
      const unlocked = unlockedBefore || followed;
      if (unlocked && !unlockedBefore) {
        StartScreenPrefs.unlockDashboard();
      }
      setHasServerConfigured(server);
      setHasFollowedSeries(followed);
      setDashboardUnlocked(unlocked);
      setStartTab(
        StartScreenPrefs.resolve({ startScreen, hasFollowedSeries: followed, dashboardUnlocked: unlocked }),
      );
    } catch {
      // Non-fatal: startup state defaults to false, the shell still renders.
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <StartupContext.Provider
      value={{
        hasServerConfigured,
        hasFollowedSeries,
        startTab,
        dashboardUnlocked,
        unreadNotificationCount,
        refresh: load,
      }}>
      {children}
    </StartupContext.Provider>
  );
}

export function useStartup(): StartupState {
  return useContext(StartupContext);
}
