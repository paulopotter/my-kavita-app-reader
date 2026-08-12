import React, { createContext, useContext, useEffect, useState } from 'react';
import { StartupBridge } from '../bridge/startup';

interface AppShellState {
  hasServerConfigured: boolean;
  hasFollowedSeries: boolean;
  unreadNotificationCount: number;
  refresh: () => void;
}

const AppShellContext = createContext<AppShellState>({
  hasServerConfigured: false,
  hasFollowedSeries: false,
  unreadNotificationCount: 0,
  refresh: () => {},
});

export function AppShellStateProvider({ children }: { children: React.ReactNode }) {
  const [hasServerConfigured, setHasServerConfigured] = useState(false);
  const [hasFollowedSeries, setHasFollowedSeries] = useState(false);
  const [unreadNotificationCount] = useState(0);

  async function load() {
    try {
      const [server, followed] = await Promise.all([
        StartupBridge.hasServerConfigured(),
        StartupBridge.hasFollowedSeries(),
      ]);
      setHasServerConfigured(server);
      setHasFollowedSeries(followed);
    } catch {
      // Non-fatal: shell state defaults to false
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <AppShellContext.Provider value={{ hasServerConfigured, hasFollowedSeries, unreadNotificationCount, refresh: load }}>
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShellState(): AppShellState {
  return useContext(AppShellContext);
}
