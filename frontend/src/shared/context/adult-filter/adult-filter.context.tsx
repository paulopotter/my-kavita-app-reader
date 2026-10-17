import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { CategoriesService } from '../../services/categories';
import { SerialsService } from '../../services/serials';
import {
  AdultFilterPrefs,
  AdultFilterTool,
  DEFAULT_ADULT_FILTER_MODE,
  EMPTY_CLASSIFICATION,
  type AdultClassification,
  type AdultFilterMode,
  type AdultFiltered,
} from '../../tools/adult-filter';
import type { AdultFilterState } from './adult-filter.types';

// A classification asked for by a render effect runs at most this often; one asked for by the
// user's own change (the category selection) always runs.
const CLASSIFY_THROTTLE_MS = 30_000;

const AdultFilterContext = createContext<AdultFilterState>({
  categories: [],
  mode: DEFAULT_ADULT_FILTER_MODE,
  unblur: false,
  classification: EMPTY_CLASSIFICATION,
  setCategories: () => {},
  setMode: () => {},
  setUnblur: () => {},
  requestClassification: () => {},
});

// Holds the user's adult-filter choices and the provider's last answer to "which series carry the
// selected categories". Renders nothing until the stored values are read (a local read, well
// inside the splash), so the first paint is already filtered with the last known answer instead
// of showing adult series for a moment and then removing them.
export function AdultFilterProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [categories, setCategoriesState] = useState<string[]>([]);
  const [mode, setModeState] = useState<AdultFilterMode>(DEFAULT_ADULT_FILTER_MODE);
  const [unblur, setUnblurState] = useState(false);
  const [classification, setClassification] = useState<AdultClassification>(EMPTY_CLASSIFICATION);

  const categoriesRef = useRef<string[]>([]);
  const runningRef = useRef(false);
  // A forced run asked for while another was in flight: run once more when it ends.
  const rerunRef = useRef(false);
  const lastRunAtRef = useRef(0);

  const classify = useCallback(async ({ force }: { force: boolean }): Promise<void> => {
    const names = categoriesRef.current;
    if (names.length === 0) {
      setClassification(EMPTY_CLASSIFICATION);
      return;
    }
    if (runningRef.current) {
      if (force) {rerunRef.current = true;}
      return;
    }
    if (!force && Date.now() - lastRunAtRef.current < CLASSIFY_THROTTLE_MS) {return;}
    runningRef.current = true;
    lastRunAtRef.current = Date.now();
    try {
      const [serials, adultIds] = await Promise.all([
        SerialsService.get({ force: false }),
        CategoriesService.serials.ids({ names }),
      ]);
      if (!serials.isSuccess) {return;}
      const next: AdultClassification = {
        adultIds: new Set(adultIds),
        knownIds: new Set(serials.serials.filter(s => s.isSuccess).map(s => (s as { id: string }).id)),
      };
      // A selection changed while this ran: its answer belongs to the old selection.
      if (categoriesRef.current !== names) {return;}
      setClassification(next);
      AdultFilterPrefs.setClassification(next).catch(() => {});
    } catch {
      // Offline / provider error: keep the last known answer.
    } finally {
      runningRef.current = false;
      if (rerunRef.current) {
        rerunRef.current = false;
        classify({ force: true });
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      AdultFilterPrefs.getCategories(),
      AdultFilterPrefs.getMode(),
      AdultFilterPrefs.getUnblur(),
      AdultFilterPrefs.getClassification(),
    ])
      .then(([storedCategories, storedMode, storedUnblur, storedClassification]) => {
        if (cancelled) {return;}
        categoriesRef.current = storedCategories;
        setCategoriesState(storedCategories);
        setModeState(storedMode);
        setUnblurState(storedUnblur);
        setClassification(storedClassification);
      })
      .catch(() => {})
      .finally(() => {
        if (cancelled) {return;}
        setReady(true);
        classify({ force: true });
      });
    return () => {
      cancelled = true;
    };
  }, [classify]);

  // Coming back to the app is when new series are most likely to have appeared.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {classify({ force: false });}
    });
    return () => sub.remove();
  }, [classify]);

  const setCategories = useCallback(
    (names: string[]) => {
      categoriesRef.current = names;
      setCategoriesState(names);
      AdultFilterPrefs.setCategories(names).catch(() => {});
      classify({ force: true });
    },
    [classify],
  );

  const setMode = useCallback((value: AdultFilterMode) => {
    setModeState(value);
    AdultFilterPrefs.setMode(value).catch(() => {});
  }, []);

  const setUnblur = useCallback((value: boolean) => {
    setUnblurState(value);
    AdultFilterPrefs.setUnblur(value).catch(() => {});
  }, []);

  const requestClassification = useCallback(() => {
    classify({ force: false });
  }, [classify]);

  const value = useMemo<AdultFilterState>(
    () => ({ categories, mode, unblur, classification, setCategories, setMode, setUnblur, requestClassification }),
    [categories, mode, unblur, classification, setCategories, setMode, setUnblur, requestClassification],
  );

  if (!ready) {return null;}
  return <AdultFilterContext.Provider value={value}>{children}</AdultFilterContext.Provider>;
}

export function useAdultFilter(): AdultFilterState {
  return useContext(AdultFilterContext);
}

// The one hook a screen calls: its items in, the items it may show out — each carrying `blurred`.
// Runs AdultFilterTool.apply at read time, so nothing the screen caches is ever filtered, and
// asks for a fresh classification when it meets series nobody has classified yet.
export function useAdultFiltered<T>({
  items,
  idOf,
}: {
  items: T[];
  idOf: (item: T) => string;
}): AdultFiltered<T>[] {
  const { categories, mode, unblur, classification, requestClassification } = useAdultFilter();
  const idOfRef = useRef(idOf);
  idOfRef.current = idOf;

  const result = useMemo(
    () =>
      AdultFilterTool.apply({
        items,
        idOf: item => idOfRef.current(item),
        mode,
        unblur,
        active: categories.length > 0,
        classification,
      }),
    [items, mode, unblur, categories, classification],
  );

  useEffect(() => {
    if (result.pending > 0) {requestClassification();}
  }, [result.pending, requestClassification]);

  return result.items;
}
