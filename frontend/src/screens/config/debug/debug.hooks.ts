import { useCallback, useEffect, useState } from 'react';
import { DiagnosticsService } from '../../../shared/services/diagnostics';
import { ReaderFlagsService } from '../../../shared/services/reader-flags';
import {
  discoverActiveGroupId,
  discoverFirstExternalGroupId,
  discoverFirstGroupId,
} from './debug.steps';

// The debug screen's shared ids. Each Section auto-discovers what it can on mount; the values
// are editable in the Section's own text field before a run (discovery can legitimately come up
// empty — e.g. no active group yet).
export function useDebugIds() {
  const [groupId, setGroupId] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [pageIndex, setPageIndex] = useState('0');
  const [externalGroupId, setExternalGroupId] = useState('');

  useEffect(() => {
    discoverActiveGroupId().then(id => {
      if (id) {
        setGroupId(id);
        return;
      }
      discoverFirstGroupId().then(fallback => {
        if (fallback) {setGroupId(fallback);}
      });
    });
    discoverFirstExternalGroupId().then(id => {
      if (id) {setExternalGroupId(id);}
    });
  }, []);

  return {
    groupId,
    setGroupId,
    seriesId,
    setSeriesId,
    chapterId,
    setChapterId,
    pageIndex,
    setPageIndex,
    externalGroupId,
    setExternalGroupId,
  };
}

// Sizes offered in the picker (MB). Native clamps to its own range, so these are only the useful
// steps: the default is 48; above ~96 Android refuses to draw the bitmap at all.
export const PAGE_BUDGET_OPTIONS = [32, 48, 64, 80];

// The reader's decoded-page size budget: the current value (null while loading) and a setter that
// shows what native actually applied (it clamps and persists).
export function usePageBudget() {
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    ReaderFlagsService.pageBudget
      .get()
      .then(mb => {
        if (alive) {setValue(mb);}
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const select = useCallback((mb: number) => {
    setValue(mb); // optimistic: the buttons answer at once
    ReaderFlagsService.pageBudget
      .set({ mb })
      .then(applied => setValue(applied))
      .catch(() => ReaderFlagsService.pageBudget.get().then(setValue).catch(() => {}));
  }, []);

  return { value, options: PAGE_BUDGET_OPTIONS, select };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {return `${bytes} B`;}
  if (bytes < 1024 * 1024) {return `${(bytes / 1024).toFixed(1)} KB`;}
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// The local diagnostics log: its size and the adb command (null until the first answer), plus the
// export / clear / refresh actions. `busy` keeps a second tap from racing the first.
export function useDiagnosticsLog() {
  const [info, setInfo] = useState<{ sizeLabel: string; adbCommand: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await DiagnosticsService.log.info();
      setInfo({ sizeLabel: formatBytes(next.sizeBytes), adbCommand: next.adbCommand });
    } catch {
      setInfo(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = useCallback(
    async (action: () => Promise<void>) => {
      setBusy(true);
      try {
        await action();
      } catch {
        // the native side reports its own failure; the card simply stays as it was
      } finally {
        setBusy(false);
        await refresh();
      }
    },
    [refresh],
  );

  const exportLog = useCallback(() => run(() => DiagnosticsService.log.export()), [run]);
  const clear = useCallback(() => run(() => DiagnosticsService.log.clear()), [run]);

  return { info, busy, refresh, exportLog, clear };
}
