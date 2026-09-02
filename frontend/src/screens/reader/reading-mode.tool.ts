import { PreferencesManager } from '../../shared/managers/preferences';
import type { ReadingMode } from './modes/reading-mode.types';

// ReadingModeTool — the reader's per-mode preference, with a global + per-series override cascade.
// Cloned deliberately from ChaptersTool.sort (shared/tools/chapters/chapters.tool.ts): same
// PreferencesManager, same domain/key scheme, same get() overloads. This domain never depends on
// that one — a shared shape is copied, not imported.
//
// Cascade: series override (key = seriesId) -> global (key = 'global') -> hardcoded default
// ('webtoon'). Resolution is top-down at every screen load, same as the chapter sort mode.

export type { ReadingMode };

export interface ReadingModePrefs {
  mode: ReadingMode;
}

const READING_MODE_PREFS_DOMAIN = 'readingModePrefs';
const GLOBAL_READING_MODE_KEY = 'global';
const DEFAULT_READING_MODE_PREFS: ReadingModePrefs = { mode: 'webtoon' };

export type ReadingModeScope = { domain: 'global' } | { domain: 'series'; seriesId: string };

function readReadingModePrefs(key: string): Promise<ReadingModePrefs | null> {
  return PreferencesManager.get({ key }).then(entry =>
    entry ? (JSON.parse(entry.value) as ReadingModePrefs) : null,
  );
}

// get()'s overloads mirror the scope, same as ChaptersTool.sort.get: 'global' always returns the
// plain prefs; 'series' returns the plain shape PLUS `isOverride: true` only when a real per-series
// override exists — otherwise it falls through to the exact same global read and the result is
// indistinguishable from a globally-scoped call.
//
// TODO (new task, does not block this): "server says webtoon". The Kavita API does not expose a
// reading layout per series/chapter — LayoutMode (0=LeftRight, 1=UpDown, 2=Webtoon) and
// allowAutomaticWebtoonReaderDetection are fields of UserReadingProfileDto (the user's server-side
// reading profile), not of SeriesDto/ChapterDto, and SerialDigest carries no layout field. If the
// app ever mirrors UserReadingProfileDto or implements a local heuristic (e.g. average page aspect
// ratio > threshold => webtoon), the cascade gains a rung BEFORE global:
// series-override -> server-signal -> global -> default. getReadingModePrefs already accepts that
// rung without changing its public signature — just one more .then() in the chain.
function getReadingModePrefs(scope: { domain: 'global' }): Promise<ReadingModePrefs>;
function getReadingModePrefs(scope: {
  domain: 'series';
  seriesId: string;
}): Promise<ReadingModePrefs | (ReadingModePrefs & { isOverride: true })>;
function getReadingModePrefs(
  scope: ReadingModeScope,
): Promise<ReadingModePrefs | (ReadingModePrefs & { isOverride: true })> {
  const seriesLookup =
    scope.domain === 'series' ? readReadingModePrefs(scope.seriesId) : Promise.resolve(null);

  return seriesLookup.then(seriesPrefs => {
    if (seriesPrefs) {return { ...seriesPrefs, isOverride: true as const };}
    return readReadingModePrefs(GLOBAL_READING_MODE_KEY).then(
      globalPrefs => globalPrefs ?? DEFAULT_READING_MODE_PREFS,
    );
  });
}

export const ReadingModeTool = {
  get: getReadingModePrefs,

  put(scope: ReadingModeScope, prefs: ReadingModePrefs): Promise<void> {
    const key = scope.domain === 'series' ? scope.seriesId : GLOBAL_READING_MODE_KEY;
    return PreferencesManager.put({
      key,
      value: JSON.stringify(prefs),
      domain: READING_MODE_PREFS_DOMAIN,
    }).then(() => undefined);
  },

  // Removes the per-series override and returns the global default that now applies — there's no
  // "reset the global" concept (nothing beyond DEFAULT_READING_MODE_PREFS, already covered by
  // get({ domain: 'global' })).
  reset({ seriesId }: { seriesId: string }): Promise<ReadingModePrefs> {
    return PreferencesManager.delete({ key: seriesId }).then(() =>
      getReadingModePrefs({ domain: 'global' }),
    );
  },
};

// A future `{ domain: 'session' }` scope (the "just for this session" 3rd level in the requirement)
// would be resolved BEFORE the series lookup here. ReadingModeScope is a union type — adding it is
// non-breaking. Not implemented now: no session-state layer exists here yet.
