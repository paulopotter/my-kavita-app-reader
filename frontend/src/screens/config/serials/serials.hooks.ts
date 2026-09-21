import { useCallback, useEffect, useState } from 'react';
import { ChaptersTool, type ChapterSortMode } from '../../../shared/tools/chapters';

// The global chapter-sort sub-screen's state, backed by ChaptersTool.sort (domain 'global').
// Contract unchanged — lifted out of ConfigScreen's ChapterSortSettingsScreen as-is.
export function useSerieSort() {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ChapterSortMode>('ASCENDING');
  const [fixedThreshold, setFixedThreshold] = useState<number | undefined>(undefined);
  const [progressPercent, setProgressPercent] = useState(50);

  useEffect(() => {
    ChaptersTool.sort
      .get({ domain: 'global' })
      .then(prefs => {
        setMode(prefs.mode);
        setFixedThreshold(prefs.fixedThreshold);
        setProgressPercent(prefs.progressPercent);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const change = useCallback(
    (nextMode: ChapterSortMode, nextThreshold: number | undefined, nextPercent: number) => {
      setMode(nextMode);
      setFixedThreshold(nextThreshold);
      setProgressPercent(nextPercent);
      ChaptersTool.sort
        .put({ domain: 'global' }, { mode: nextMode, fixedThreshold: nextThreshold, progressPercent: nextPercent })
        .catch(() => {});
    },
    [],
  );

  return { loading, mode, fixedThreshold, progressPercent, change };
}
