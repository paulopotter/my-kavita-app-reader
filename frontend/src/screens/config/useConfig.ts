import { useCallback, useEffect, useReducer } from 'react';
import { AuthConfig, BffServerConfig, ServerConfig, UiPreferences } from '../../shared/bridge/config';
import {
  addBffServer,
  deleteServer,
  loadConfig,
  removeBffServer,
  saveApiKey,
  savePreferences,
  saveServer,
} from './ConfigService';

interface State {
  loading: boolean;
  servers: ServerConfig[];
  auth: AuthConfig | null;
  prefs: UiPreferences | null;
  bffServers: BffServerConfig[];
  error: string | null;
}

type Action =
  | { type: 'LOADING' }
  | {
      type: 'LOADED';
      servers: ServerConfig[];
      auth: AuthConfig | null;
      prefs: UiPreferences;
      bffServers: BffServerConfig[];
    }
  | { type: 'ERROR'; error: string }
  | { type: 'SET_SERVERS'; servers: ServerConfig[] }
  | { type: 'SET_AUTH'; auth: AuthConfig }
  | { type: 'SET_PREFS'; prefs: UiPreferences }
  | { type: 'SET_BFF_SERVERS'; bffServers: BffServerConfig[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null };
    case 'LOADED':
      return {
        loading: false,
        servers: action.servers,
        auth: action.auth,
        prefs: action.prefs,
        bffServers: action.bffServers,
        error: null,
      };
    case 'ERROR':
      return { ...state, loading: false, error: action.error };
    case 'SET_SERVERS':
      return { ...state, servers: action.servers };
    case 'SET_AUTH':
      return { ...state, auth: action.auth };
    case 'SET_PREFS':
      return { ...state, prefs: action.prefs };
    case 'SET_BFF_SERVERS':
      return { ...state, bffServers: action.bffServers };
  }
}

const initial: State = {
  loading: true,
  servers: [],
  auth: null,
  prefs: null,
  bffServers: [],
  error: null,
};

export function useConfig() {
  const [state, dispatch] = useReducer(reducer, initial);

  const reload = useCallback(async () => {
    dispatch({ type: 'LOADING' });
    try {
      const { servers, auth, prefs, bffServers } = await loadConfig();
      dispatch({ type: 'LOADED', servers, auth, prefs, bffServers });
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

  const handleAddBffServer = useCallback(async (
    url: string,
    healthCheckPath: string,
    linkedKavitaServerConfigId?: string,
  ) => {
    await addBffServer(url, healthCheckPath, linkedKavitaServerConfigId);
    const { bffServers } = await loadConfig();
    dispatch({ type: 'SET_BFF_SERVERS', bffServers });
  }, []);

  const handleRemoveBffServer = useCallback(async (id: string) => {
    await removeBffServer(id);
    const { bffServers } = await loadConfig();
    dispatch({ type: 'SET_BFF_SERVERS', bffServers });
  }, []);

  return {
    ...state,
    reload,
    saveServer: handleSaveServer,
    deleteServer: handleDeleteServer,
    saveApiKey: handleSaveApiKey,
    savePreferences: handleSavePreferences,
    addBffServer: handleAddBffServer,
    removeBffServer: handleRemoveBffServer,
  };
}
