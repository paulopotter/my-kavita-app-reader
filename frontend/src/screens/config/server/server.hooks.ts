import { useCallback, useEffect, useState } from 'react';
import { ConfigRepository, type BffServerConfig } from '../../../shared/bridge/config';
import type {
  ProviderInfo,
  ServerGroupInfo,
  ServerUrlInfo,
  UrlProbeResult,
} from '../../../shared/bridge/server';
import { ServerService, ServersService } from '../../../shared/services/servers';
import { StringTool } from '../../../shared/tools/string';
import type { ConnStatus } from './server.types';

// ⚠️ TASK 035 — LAYER 1 + 2 (server/group + URLs).
// The server (group) and its URLs are on the new :server contract. Still legacy:
//  - BFF (its own layer)
//  - the JWT-refresh trigger / auth-status (needs the refresh design)
// Single-server rule: the screen operates groups[0]; the "add server" button hides once one
// exists. Two-URL rule: same, the "add URL" button hides at MAX_URLS_PER_GROUP.

const DEFAULT_URL_TIMEOUT_MS = 5000;
export const MAX_URLS_PER_GROUP = 2;

export interface ServerCredentials {
  [field: string]: string;
}

export interface UseServerResult {
  loading: boolean;

  // ── server / group ──
  providers: ProviderInfo[];
  group: ServerGroupInfo | null;
  credentials: ServerCredentials;
  maskedCredential: (field: string) => string | null;
  // `firstUrl` is only used by the "add server" modal, which cadastra name + credentials + one
  // URL together on the very first save.
  addServer: (name: string, credentials: ServerCredentials, firstUrl: string) => Promise<string | null>;
  updateServer: (name: string, credentials: ServerCredentials) => Promise<string | null>;
  removeServer: () => Promise<void>;

  // ── urls ──
  urls: ServerUrlInfo[];
  activeUrlId: string | null;
  canAddUrl: boolean;
  canRemoveUrl: boolean; // false when only one URL remains (a group must keep at least one)
  nextPriority: number;
  addUrl: (url: string, priority: number) => Promise<string | null>;
  updateUrl: (urlId: string, url: string, priority: number) => Promise<string | null>;
  removeUrl: (urlId: string) => Promise<void>;
  // Point check on a typed-in URL — does not change the active URL. Returns the full probe;
  // the screen shows only .ok.
  testUrl: (url: string) => Promise<UrlProbeResult>;

  // ── group-level connection test (switches the active URL) ──
  connStatus: ConnStatus;
  connMessage: string;
  testConnection: () => Promise<void>;

  // ── bff (LEGACY — migrates in its own layer) ──
  bffServers: BffServerConfig[];

  reload: () => Promise<void>;
}

export function useServer(opts?: { onServerCleared?: () => void }): UseServerResult {
  const [loading, setLoading] = useState(true);

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [group, setGroup] = useState<ServerGroupInfo | null>(null);
  const [urls, setUrls] = useState<ServerUrlInfo[]>([]);
  const [activeUrlId, setActiveUrlId] = useState<string | null>(null);
  const [bffServers, setBffServers] = useState<BffServerConfig[]>([]);

  const [connStatus, setConnStatus] = useState<ConnStatus>('idle');
  const [connMessage, setConnMessage] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [prov, groups, legacyBff] = await Promise.all([
        ServersService.providers.list(),
        ServersService.groups.list(),
        ConfigRepository.getBffServerConfigs(),
      ]);
      setProviders(prov);
      setBffServers(legacyBff);

      const g = groups[0] ?? null; // single-server: the screen only ever shows groups[0]
      setGroup(g);

      if (g) {
        const [groupUrls, active] = await Promise.all([
          ServerService.urls.list({ groupId: g.id }),
          ServerService.urls.getActive({ groupId: g.id }).catch(() => null),
        ]);
        setUrls([...groupUrls].sort((a, b) => a.priority - b.priority));
        setActiveUrlId(active?.id ?? null);
      } else {
        setUrls([]);
        setActiveUrlId(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // ── server / group ─────────────────────────────────────────────────────────
  const credentials: ServerCredentials = (() => {
    if (!group?.credentialsJson) {return {};}
    try {
      const parsed = JSON.parse(group.credentialsJson);
      return parsed && typeof parsed === 'object' ? (parsed as ServerCredentials) : {};
    } catch {
      return {};
    }
  })();

  const maskedCredential = useCallback(
    (field: string) => {
      const value = credentials[field];
      return value ? StringTool.mask(value) : null;
    },
    [credentials],
  );

  const addServer = useCallback(
    async (name: string, creds: ServerCredentials, firstUrl: string): Promise<string | null> => {
      const provider = providers[0];
      if (!provider) {return 'Nenhum provedor de servidor disponível';}
      try {
        const created = await ServerService.group.add({
          name: name.trim(),
          providerId: provider.id,
          credentialsJson: JSON.stringify(creds),
          healthCheckPath: '/api/Health',
        });
        await ServerService.urls.add({
          groupId: created.id,
          url: firstUrl.trim(),
          timeoutMs: DEFAULT_URL_TIMEOUT_MS,
          priority: 0,
        });
        await ServerService.group.active.set({ groupId: created.id }); // authenticates + resolves a URL
        await reload();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },
    [providers, reload],
  );

  const updateServer = useCallback(
    async (name: string, creds: ServerCredentials): Promise<string | null> => {
      if (!group) {return 'Nenhum servidor para editar';}
      const credentialsChanged = JSON.stringify(creds) !== group.credentialsJson;
      try {
        await ServerService.group.update({
          groupId: group.id,
          name: name.trim(),
          credentialsJson: JSON.stringify(creds),
        });
        if (credentialsChanged) {
          await ServerService.group.active.set({ groupId: group.id }); // re-authenticate
        }
        await reload();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },
    [group, reload],
  );

  const removeServer = useCallback(async () => {
    if (!group) {return;}
    await ServerService.group.remove({ groupId: group.id }); // takes its URLs + credentials with it
    // Orphaned legacy BFF/auth config from the old path — clear it too so the app really is back
    // to "no server". (Drops out when BFF migrates off ConfigRepository.)
    const legacyBff = await ConfigRepository.getBffServerConfigs();
    await Promise.all([
      ConfigRepository.upsertAuthConfig({ apiKey: '' }),
      ...legacyBff.map(b => ConfigRepository.deleteBffServerConfig(b.id)),
    ]);
    opts?.onServerCleared?.();
  }, [group, opts]);

  // ── urls ───────────────────────────────────────────────────────────────────
  const canAddUrl = urls.length < MAX_URLS_PER_GROUP;
  const canRemoveUrl = urls.length > 1;
  const nextPriority = urls.length === 0 ? 0 : Math.max(...urls.map(u => u.priority)) + 1;

  const addUrl = useCallback(
    async (url: string, priority: number): Promise<string | null> => {
      if (!group) {return 'Nenhum servidor';}
      try {
        await ServerService.urls.add({
          groupId: group.id,
          url: url.trim(),
          timeoutMs: DEFAULT_URL_TIMEOUT_MS,
          priority: Math.max(0, priority),
        });
        await reload();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },
    [group, reload],
  );

  const updateUrl = useCallback(
    async (urlId: string, url: string, priority: number): Promise<string | null> => {
      if (!group) {return 'Nenhum servidor';}
      try {
        await ServerService.urls.update({
          groupId: group.id,
          urlId,
          url: url.trim(),
          priority: Math.max(0, priority),
        });
        await reload();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },
    [group, reload],
  );

  const removeUrl = useCallback(
    async (urlId: string) => {
      if (!group || urls.length <= 1) {return;} // a group must keep at least one URL
      await ServerService.urls.remove({ groupId: group.id, urlId });
      await reload();
    },
    [group, urls.length, reload],
  );

  const testUrl = useCallback(
    async (url: string): Promise<UrlProbeResult> => {
      if (!group) {return { url, ok: false, status: null, elapsedMs: 0 };}
      return ServerService.urls.test({ groupId: group.id, url: url.trim() });
    },
    [group],
  );

  // ── group-level connection test (switches the active URL) ───────────────────
  const testConnection = useCallback(async () => {
    if (!group) {return;}
    setConnStatus('testing');
    setConnMessage('');
    try {
      const winner = await ServerService.urls.validate({ groupId: group.id });
      setConnStatus('ok');
      setConnMessage(winner.url);
      setActiveUrlId(winner.id);
    } catch (e: any) {
      setConnStatus('error');
      setConnMessage(e?.message ?? 'error');
    }
  }, [group]);

  return {
    loading,
    providers,
    group,
    credentials,
    maskedCredential,
    addServer,
    updateServer,
    removeServer,
    urls,
    activeUrlId,
    canAddUrl,
    canRemoveUrl,
    nextPriority,
    addUrl,
    updateUrl,
    removeUrl,
    testUrl,
    connStatus,
    connMessage,
    testConnection,
    bffServers,
    reload,
  };
}
