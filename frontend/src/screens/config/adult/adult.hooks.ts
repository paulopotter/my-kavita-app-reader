import { useCallback, useEffect, useState } from 'react';
import { useAdultFilter } from '../../../shared/context/adult-filter';
import { CategoriesService } from '../../../shared/services/categories';

type CategoriesStatus = 'loading' | 'ready' | 'error';

// useAdultFilterConfig — the adult-content filter's choices (kept by AdultFilterProvider, which
// persists them) plus the provider's category names to pick from. The list is read each time the
// screen opens, so a category added on the server shows up; the selection itself is stored by
// NAME, so it survives the server being replaced.
export function useAdultFilterConfig() {
  const filter = useAdultFilter();
  const [available, setAvailable] = useState<string[]>([]);
  const [status, setStatus] = useState<CategoriesStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    CategoriesService.list()
      .then(names => {
        if (cancelled) {return;}
        setAvailable(names);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) {setStatus('error');}
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addCategory = useCallback(
    (name: string) => {
      if (!filter.categories.includes(name)) {filter.setCategories([...filter.categories, name]);}
    },
    [filter],
  );

  const removeCategory = useCallback(
    (name: string) => filter.setCategories(filter.categories.filter(c => c !== name)),
    [filter],
  );

  // Revealing the filtered items (blurred) is one switch; the blur only exists while it is on.
  const reveal = filter.mode === 'blur';
  const setReveal = useCallback((value: boolean) => filter.setMode(value ? 'blur' : 'hidden'), [filter]);

  return {
    unblur: filter.unblur,
    selected: filter.categories,
    available,
    status,
    reveal,
    setReveal,
    only: filter.only,
    setOnly: filter.setOnly,
    setUnblur: filter.setUnblur,
    addCategory,
    removeCategory,
  };
}
