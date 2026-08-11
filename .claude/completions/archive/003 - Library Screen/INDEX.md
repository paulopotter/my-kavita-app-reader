# Plan 003 — Library Screen — Task Index

| # | Task | Status | Blocks | Blocked by |
|---|------|--------|--------|------------|
| 001 | core — new entities + DAOs (ChapterCache, ReadingProgress, BffMatch, BffServerConfig) + AppDatabase migration + UiPreferences fields | done | 002, 003 | — |
| 002 | tools/bridge — ConfigStore + ConfigRepository BFF CRUD + LibraryModule | done | 004 | 001 |
| 003 | features — BffFeature (active-URL resolution, healthcheck, syncBff, normalised match) | done | 004 | 001 |
| 004 | features — KavitaSeriesFeature (listSeries, saveReadingProgress, deriveReadStatus, resolveProgress) | done | 005 | 002, 003 |
| 005 | app — AppReactPackage + MainApplication wiring for new features | done | 006 | 004 |
| 006 | app — SplashActivity sync logic (listSeries → syncBff, timeout 30 s, skip within 5 min, ProgressBar StateFlow) | done | 007 | 005 |
| 007 | frontend i18n — strings.ts + useStrings hook + migrate existing hardcoded strings | done | 008, 010, 011 | — |
| 008 | frontend bridge — library.ts (LibraryBridge) + config.ts BFF CRUD + language field | done | 009 | 007 |
| 009 | frontend library — LibraryTransform.ts + __tests__/LibraryTransform.test.ts | done | 010 | 008 |
| 010 | frontend library — LibraryService.ts + useLibrary.ts + SeriesCard.tsx + LibraryScreen.tsx | done | 011 | 007, 009 |
| 011 | frontend nav — BottomBar.tsx + App.tsx refactor (two-tab bottom navigation) | done | 012 | 007, 010 |
| 012 | frontend config — ConfigScreen BFF section + language switch + migrate strings | done | 013 | 007, 011 |
| 013 | Build + install on device + manual verification | done | — | 012 |
| 014 | Docs — commit implementation documentation | done | — | 013 |
