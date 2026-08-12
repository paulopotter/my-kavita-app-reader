# Plan 002 — Splash Screen & Navigation — Tasks

| # | Task | Status |
|---|------|--------|
| 001 | features — create SplashSyncCoordinator + extend KavitaSeriesFeature with listChaptersForSeries | done |
| 002 | app — create StartupModule (8 methods, SharedPreferences, ProcessLifecycleMarker) | done |
| 003 | app — extend SplashActivity (remove sync, keep OTA) + MainActivity (onStop) + AppReactPackage (register StartupModule) | done |
| 004 | frontend — install react-navigation deps + create routes.ts + create startup.ts bridge | done |
| 005 | frontend — create useSplash.ts (5 s timer, mixed progress, destination decision, OTA button via OtaEmitter) | done |
| 006 | frontend — create SplashScreen.tsx (absolute overlay: logo, animated bar, version, OTA button) | done |
| 007 | frontend — create placeholder screens: Following, Search, Notifications, SeriesDetail (smart back), Reader (back to series) | done |
| 008 | frontend — create AppShellState.tsx + MainNavigator.tsx (conditional tabs, saveState/restoreState, hidden in Config sub-screen) | done |
| 009 | frontend — create RootNavigator.tsx (complete graph + deep links both schemes) + extend App.tsx (NavigationContainer + overlay + persistence listener) | done |
| 010 | frontend — extend strings.ts (tab labels + splashVersion, PT-BR and EN) | done |
| 011 | Build + install on device + manual verification (14 scenarios) | done |
| 012 | Docs — commit with implementation documentation | done |
