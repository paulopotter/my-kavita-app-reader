import React, { createContext, useContext, useEffect, useState } from 'react';
import { StartupBridge } from '../../bridge/startup';
import type { StartupState } from './startup.types';

const StartupContext = createContext<StartupState>({
  hasServerConfigured: false,
  hasFollowedSeries: false,
  unreadNotificationCount: 0,
  refresh: () => {},
});

export function StartupProvider({ children }: { children: React.ReactNode }) {
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
      // Non-fatal: startup state defaults to false, the shell still renders.
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <StartupContext.Provider
      value={{ hasServerConfigured, hasFollowedSeries, unreadNotificationCount, refresh: load }}>
      {children}
    </StartupContext.Provider>
  );
}

export function useStartup(): StartupState {
  return useContext(StartupContext);
}
