import { useCallback, useEffect, useReducer } from 'react';
import { SeriesSummary } from '../../shared/bridge/library';
import { fetchSeries, syncBff } from './LibraryService';

interface State {
  loading: boolean;
  data: SeriesSummary[];
  error: string | null;
}

type Action =
  | { type: 'LOADING' }
  | { type: 'LOADED'; data: SeriesSummary[] }
  | { type: 'ERROR'; error: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null };
    case 'LOADED':
      return { loading: false, data: action.data, error: null };
    case 'ERROR':
      return { ...state, loading: false, error: action.error };
  }
}

const initial: State = { loading: true, data: [], error: null };

export function useLibrary() {
  const [state, dispatch] = useReducer(reducer, initial);

  const refresh = useCallback(async (forceRefresh = false) => {
    dispatch({ type: 'LOADING' });
    try {
      const series = await fetchSeries(forceRefresh);
      dispatch({ type: 'LOADED', data: series });
      syncBff().catch(() => {});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      dispatch({ type: 'ERROR', error: msg });
    }
  }, []);

  useEffect(() => {
    refresh(false);
  }, [refresh]);

  return { ...state, refresh };
}
