import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConfigRepository,
  SetupBridge,
  type AuthConfig,
  type BffServerConfig,
  type ServerConfig,
} from '../../../shared/bridge/config';
import { StringTool } from '../../../shared/tools/string';
import { UrlTool } from '../../../shared/tools/url';
import type { AuthStatus, ConnStatus } from './server.types';

// ⚠️ TASK 035 — STRUCTURE-ONLY PASS.
// This hook is the old ConfigScreen.ServerScreen logic, lifted into one place and split by
// concern (kavita urls / auth / bff), but STILL on the legacy contract
// (SetupBridge / ConfigRepository). The whole point of Task 035 is to swap this for
// ServerService / ExternalService and wire the JWT refresh — that's the NEXT pass, decided with
// the user. Nothing here is final; it exists so the screen has something to call while we move
// the logic.

export interface UseServerResult {
  loading: boolean;

  // ── kavita urls ──
  servers: ServerConfig[];
  activeKavitaUrl: string;
  connStatus: ConnStatus;
  connMessage: string;
  saveKavitaUrl: (url: string, editingId: string | null) => Promise<string | null>; // returns error or null
  deleteKavitaUrl: (id: string) => Promise<void>;
  testKavitaConnection: () => Promise<void>;

  // ── auth ──
  auth: AuthConfig | null;
  authStatus: AuthStatus;
  authMessage: string;
  saveApiKey: (rawKey: string) => Promise<void>;
  deleteApiKey: () => Promise<void>;
  maskedApiKey: string | null;

  // ── bff ──
  bffServers: BffServerConfig[];
  activeBffUrl: string;
  bffStatus: ConnStatus;
  bffMessage: string;
  saveBff: (url: string, path: string, linkedKavitaId: string | undefined, editingId: string | null) => Promise<string | null>;
  deleteBff: (id: string) => Promise<void>;
  testBffConnection: () => Promise<void>;

  reload: () => Promise<void>;
}

export function useServer(opts?: { onServerCleared?: () => void }): UseServerResult {
  const [loading, setLoading] = useState(true);
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [auth, setAuth] = useState<AuthConfig | null>(null);
  const [bffServers, setBffServers] = useState<BffServerConfig[]>([]);

  const [activeKavitaUrl, setActiveKavitaUrl] = useState('');
  const [activeBffUrl, setActiveBffUrl] = useState('');
  const [connStatus, setConnStatus] = useState<ConnStatus>('idle');
  const [connMessage, setConnMessage] = useState('');
  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle');
  const [authMessage, setAuthMessage] = useState('');
  const [bffStatus, setBffStatus] = useState<ConnStatus>('idle');
  const [bffMessage, setBffMessage] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, b] = await Promise.all([
        ConfigRepository.getServerConfigs(),
        ConfigRepository.getAuthConfig(),
        ConfigRepository.getBffServerConfigs(),
      ]);
      setServers(s);
      setAuth(a);
      setBffServers(b);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Last-known active URLs from the Kotlin cache, shown before any test runs.
  const didLoadKnown = useRef(false);
  useEffect(() => {
    if (didLoadKnown.current) {return;}
    didLoadKnown.current = true;
    SetupBridge.getLastKnownUrls()
      .then(known => {
        if (known.kavitaUrl) {setActiveKavitaUrl(known.kavitaUrl);}
        if (known.bffUrl) {setActiveBffUrl(known.bffUrl);}
      })
      .catch(() => {});
  }, []);

  // ── kavita urls ────────────────────────────────────────────────────────────
  const saveKavitaUrl = useCallback(
    async (raw: string, editingId: string | null): Promise<string | null> => {
      const url = raw.trim();
      if (!UrlTool.isValid(url)) {return 'URL inválida (use http:// ou https://)';}
      if (editingId) {
        const existing = servers.find(s => s.id === editingId);
        if (existing) {await ConfigRepository.upsertServerConfig({ ...existing, url });}
      } else {
        await ConfigRepository.upsertServerConfig({
          id: `server-${Date.now()}`,
          url,
          timeoutMs: 5000,
          priority: servers.length,
          healthCheckPath: '/api/Health',
        });
      }
      await reload();
      return null;
    },
    [servers, reload],
  );

  const deleteKavitaUrl = useCallback(
    async (id: string) => {
      await ConfigRepository.deleteServerConfig(id);
      const remaining = servers.filter(s => s.id !== id);
      if (remaining.length === 0) {
        await Promise.all([
          ConfigRepository.upsertAuthConfig({ apiKey: '' }),
          ...bffServers.map(b => ConfigRepository.deleteBffServerConfig(b.id)),
        ]);
        opts?.onServerCleared?.();
        return;
      }
      await reload();
      setConnStatus('idle');
      setActiveKavitaUrl('');
    },
    [servers, bffServers, reload, opts],
  );

  const testKavitaConnection = useCallback(async () => {
    setConnStatus('testing');
    setConnMessage('');
    try {
      const result = await SetupBridge.testKavitaConnection();
      setConnStatus('ok');
      setConnMessage(result.activeUrl);
      setActiveKavitaUrl(result.activeUrl);
    } catch (e: any) {
      setConnStatus('error');
      setConnMessage(e?.message ?? 'error');
      setActiveKavitaUrl('');
    }
  }, []);

  // ── auth ───────────────────────────────────────────────────────────────────
  const saveApiKey = useCallback(
    async (rawKey: string) => {
      const key = rawKey.trim();
      if (!key) {return;}
      setAuthStatus('loading');
      setAuthMessage('');
      try {
        await SetupBridge.authenticate(key);
        setAuthStatus('ok');
        await reload();
      } catch (e: any) {
        setAuthStatus('error');
        setAuthMessage(e?.message ?? 'error');
      }
    },
    [reload],
  );

  const deleteApiKey = useCallback(async () => {
    await ConfigRepository.upsertAuthConfig({ apiKey: '' });
    setAuthStatus('idle');
    await reload();
  }, [reload]);

  const maskedApiKey = auth?.apiKey ? StringTool.mask(auth.apiKey) : null;

  // ── bff ────────────────────────────────────────────────────────────────────
  const saveBff = useCallback(
    async (
      raw: string,
      path: string,
      linkedKavitaId: string | undefined,
      editingId: string | null,
    ): Promise<string | null> => {
      const url = raw.trim();
      if (!UrlTool.isValid(url)) {return 'URL inválida (use http:// ou https://)';}
      if (editingId) {await ConfigRepository.deleteBffServerConfig(editingId);}
      await ConfigRepository.insertBffServerConfig({
        url,
        priority: 0,
        healthCheckPath: path.trim() || '/manga',
        linkedKavitaServerConfigId: linkedKavitaId,
      });
      await reload();
      return null;
    },
    [reload],
  );

  const deleteBff = useCallback(
    async (id: string) => {
      await ConfigRepository.deleteBffServerConfig(id);
      await reload();
      setBffStatus('idle');
      setActiveBffUrl('');
    },
    [reload],
  );

  const testBffConnection = useCallback(async () => {
    setBffStatus('testing');
    setBffMessage('');
    try {
      const result = await SetupBridge.testBffConnection();
      setBffStatus('ok');
      setBffMessage(result.activeUrl);
      setActiveBffUrl(result.activeUrl);
    } catch (e: any) {
      setBffStatus('error');
      setBffMessage(e?.message ?? 'error');
      setActiveBffUrl('');
    }
  }, []);

  return {
    loading,
    servers,
    activeKavitaUrl,
    connStatus,
    connMessage,
    saveKavitaUrl,
    deleteKavitaUrl,
    testKavitaConnection,
    auth,
    authStatus,
    authMessage,
    saveApiKey,
    deleteApiKey,
    maskedApiKey,
    bffServers,
    activeBffUrl,
    bffStatus,
    bffMessage,
    saveBff,
    deleteBff,
    testBffConnection,
    reload,
  };
}
