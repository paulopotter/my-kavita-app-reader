import { NativeModules } from 'react-native';

function mod(): typeof NativeModules.StartupModule {
  const m = NativeModules.StartupModule;
  if (!m) { throw new Error('StartupModule not available — rebuild APK'); }
  return m;
}

function safeCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return fn();
  } catch (e) {
    return Promise.reject(e);
  }
}

export const StartupBridge = {
  hasServerConfigured(): Promise<boolean> {
    return safeCall(() => mod().hasServerConfigured());
  },

  hasFollowedSeries(): Promise<boolean> {
    return safeCall(() => mod().hasFollowedSeries());
  },

  syncBlocking(): Promise<{ success: boolean }> {
    return safeCall(() => mod().syncBlocking());
  },

  syncInBackground(): Promise<null> {
    return safeCall(() => mod().syncInBackground());
  },

  drainSyncQueue(): Promise<null> {
    return safeCall(() => mod().drainSyncQueue());
  },

  isSeriesFollowed(seriesId: string): Promise<boolean> {
    return safeCall(() => mod().isSeriesFollowed(seriesId));
  },

  getRestoredRoute(): Promise<string | null> {
    return safeCall(() => mod().getRestoredRoute());
  },

  notifyRouteChanged(route: string, isRootRoute: boolean, rootRoute?: string): Promise<null> {
    return safeCall(() => mod().notifyRouteChanged(route, isRootRoute, rootRoute ?? null));
  },
};
