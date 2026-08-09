import { useCallback, useEffect, useReducer } from 'react';
import { ServerConfig, AuthConfig, UiPreferences } from '../../shared/bridge/config';
import {
  loadConfig,
  saveServer,
  deleteServer,
  saveApiKey,
  savePreferences,
} from './ConfigService';

interface State {
  loading: boolean;
  servers: ServerConfig[];
  auth: AuthConfig | null;
  prefs: UiPreferences | null;
  error: string | null;
}

type Action =
  | { type: 'LOADING' }
  | { type: 'LOADED'; servers: ServerConfig[]; auth: AuthConfig | null; prefs: UiPreferences }
  | { type: 'ERROR'; error: string }
  | { type: 'SET_SERVERS'; servers: ServerConfig[] }
  | { type: 'SET_AUTH'; auth: AuthConfig }
  | { type: 'SET_PREFS'; prefs: UiPreferences };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADING': return { ...state, loading: true, error: null };
    case 'LOADED': return { loading: false, servers: action.servers, auth: action.auth, prefs: action.prefs, error: null };
    case 'ERROR': return { ...state, loading: false, error: action.error };
    case 'SET_SERVERS': return { ...state, servers: action.servers };
    case 'SET_AUTH': return { ...state, auth: action.auth };
    case 'SET_PREFS': return { ...state, prefs: action.prefs };
  }
}

const initial: State = { loading: true, servers: [], auth: null, prefs: null, error: null };

export function useConfig() {
  const [state, dispatch] = useReducer(reducer, initial);

  const reload = useCallback(async () => {
    dispatch({ type: 'LOADING' });
    try {
      const { servers, auth, prefs } = await loadConfig();
      dispatch({ type: 'LOADED', servers, auth, prefs });
    } catch (e) {
      dispatch({ type: 'ERROR', error: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleSaveServer = useCallback(async (server: ServerConfig) => {
    const result = await saveServer(server);
    if (result.ok) {
      const { servers } = await loadConfig();
      dispatch({ type: 'SET_SERVERS', servers });
    }
    return result;
  }, []);

  const handleDeleteServer = useCallback(async (id: string) => {
    await deleteServer(id);
    const { servers } = await loadConfig();
    dispatch({ type: 'SET_SERVERS', servers });
  }, []);

  const handleSaveApiKey = useCallback(async (rawApiKey: string) => {
    const result = await saveApiKey(rawApiKey);
    if (result.ok) {
      const { auth } = await loadConfig();
      if (auth) { dispatch({ type: 'SET_AUTH', auth }); }
    }
    return result;
  }, []);

  const handleSavePreferences = useCallback(async (update: Partial<UiPreferences>) => {
    await savePreferences(update);
    const { prefs } = await loadConfig();
    dispatch({ type: 'SET_PREFS', prefs });
  }, []);

  return {
    ...state,
    reload,
    saveServer: handleSaveServer,
    deleteServer: handleDeleteServer,
    saveApiKey: handleSaveApiKey,
    savePreferences: handleSavePreferences,
  };
}
