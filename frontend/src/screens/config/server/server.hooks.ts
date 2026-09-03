import { useCallback, useEffect, useState } from 'react';
import type { ExternalMetadataGroupInfo, ExternalMetadataUrlInfo, ProviderInfo, ServerGroupInfo, ServerUrlInfo, UrlProbeResult } from '../../../shared/bridge';
import { useStrings } from '../../../shared/i18n';
import type { Strings } from '../../../shared/i18n';
import { EventBus, useEvent } from '../../../shared/managers/events';
import {
  ExternalService,
  ExternalsService,
  ServerEvents,
  ServerService,
  ServersService,
} from '../../../shared/services/servers';
import { StringTool } from '../../../shared/tools/string';
import type { ConnStatus } from './server.types';

// ⚠️ TASK 035 — LAYER 1 + 2 + 3 (server + URLs + metadata server).
// The server, its URLs, and the metadata server (its own :external-metadata-server group +
// URLs + the "link a URL to a server URL" association) are all on the new contracts. Still
// legacy: the JWT-refresh trigger / auth-status (needs the refresh design).
// Single-server / single-metadata-server rule: the screen operates groups[0]; the "add" button
// hides once one exists. Two-URL rule: the "add URL" button hides at MAX_URLS_PER_GROUP.

const DEFAULT_URL_TIMEOUT_MS = 5000;
export const MAX_URLS_PER_GROUP = 2;

// Turn the raw :server / :external-metadata-server exception text into something a user can read.
// The native side throws developer-worded messages ("Could not resolve a healthy URL for group
// g-personalbff-1: No URL responded to health check"); map the ones the config screen can
// actually surface, fall back to a generic line for the rest.
function friendlyConnError(t: Strings, raw: string): string {
  if (/no url responded|no healthy|could not resolve a healthy url/i.test(raw)) {
    return t.serverConnErrorNoUrl;
  }
  if (/no active server group/i.test(raw)) {
    return t.serverConnErrorNoActiveGroup;
  }
  return t.serverConnErrorGeneric;
}

// After the server's active URL is (re)resolved, tell the rest of the app so the linked metadata
// group can re-resolve too (see servers.events). Best-effort: if we can't read the active URL,
// nothing is emitted rather than firing a bogus event.
async function emitActiveUrlChanged(groupId: string): Promise<void> {
  const active = await ServerService.urls.getActive({ groupId }).catch(() => null);
  if (active) {
    EventBus.emit(ServerEvents.activeUrlChanged, { groupId, urlId: active.id, url: active.url });
  }
}

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
  // The 3rd arg (linkedServerUrlId) is only meaningful for a metadata-server URL; useServer
  // ignores it. Keeping the shape identical to useMetadataServer lets one dumb <ServerSection>
  // drive both.
  addUrl: (url: string, priority: number, linkedServerUrlId?: string) => Promise<string | null>;
  updateUrl: (
    urlId: string,
    url: string,
    priority: number,
    linkedServerUrlId?: string,
  ) => Promise<string | null>;
  removeUrl: (urlId: string) => Promise<void>;
  // Point check on a typed-in URL — does not change the active URL. Returns the full probe;
  // the screen shows only .ok.
  testUrl: (url: string) => Promise<UrlProbeResult>;

  // ── group-level connection test (switches the active URL) ──
  connStatus: ConnStatus;
  connMessage: string;
  testConnection: () => Promise<void>;

  reload: () => Promise<void>;
}

export function useServer(opts?: { onServerCleared?: () => void }): UseServerResult {
  const t = useStrings();
  const [loading, setLoading] = useState(true);

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [group, setGroup] = useState<ServerGroupInfo | null>(null);
  const [urls, setUrls] = useState<ServerUrlInfo[]>([]);
  const [activeUrlId, setActiveUrlId] = useState<string | null>(null);

  const [connStatus, setConnStatus] = useState<ConnStatus>('idle');
  const [connMessage, setConnMessage] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [prov, groups] = await Promise.all([
        ServersService.providers.list(),
        ServersService.groups.list(),
      ]);
      setProviders(prov);

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
      if (!provider) {return t.serverErrorNoProvider;}
      try {
        const created = await ServerService.group.add({
          name: name.trim(),
          providerId: provider.id,
          credentialsJson: JSON.stringify(creds),
          healthCheckPath: provider.defaultHealthCheckPath,
        });
        await ServerService.urls.add({
          groupId: created.id,
          url: firstUrl.trim(),
          timeoutMs: DEFAULT_URL_TIMEOUT_MS,
          priority: 0,
        });
        await ServerService.group.active.set({ groupId: created.id }); // authenticates + resolves a URL
        await emitActiveUrlChanged(created.id);
        await reload();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },
    [providers, reload, t],
  );

  const updateServer = useCallback(
    async (name: string, creds: ServerCredentials): Promise<string | null> => {
      if (!group) {return t.serverErrorNoServerToEdit;}
      const credentialsChanged = JSON.stringify(creds) !== group.credentialsJson;
      try {
        await ServerService.group.update({
          groupId: group.id,
          name: name.trim(),
          credentialsJson: JSON.stringify(creds),
        });
        if (credentialsChanged) {
          await ServerService.group.active.set({ groupId: group.id }); // re-authenticate
          await emitActiveUrlChanged(group.id);
        }
        await reload();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },
    [group, reload, t],
  );

  const removeServer = useCallback(async () => {
    if (!group) {return;}
    await ServerService.group.remove({ groupId: group.id }); // takes its URLs + credentials with it
    opts?.onServerCleared?.();
  }, [group, opts]);

  // ── urls ───────────────────────────────────────────────────────────────────
  const canAddUrl = urls.length < MAX_URLS_PER_GROUP;
  const canRemoveUrl = urls.length > 1;
  const nextPriority = urls.length === 0 ? 0 : Math.max(...urls.map(u => u.priority)) + 1;

  const addUrl = useCallback(
    async (url: string, priority: number): Promise<string | null> => {
      if (!group) {return t.serverErrorNoServer;}
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
    [group, reload, t],
  );

  const updateUrl = useCallback(
    async (urlId: string, url: string, priority: number): Promise<string | null> => {
      if (!group) {return t.serverErrorNoServer;}
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
    [group, reload, t],
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
      // validate() just moved the active URL — let the linked metadata group re-resolve.
      EventBus.emit(ServerEvents.activeUrlChanged, {
        groupId: group.id,
        urlId: winner.id,
        url: winner.url,
      });
    } catch (e: any) {
      setConnStatus('error');
      setConnMessage(friendlyConnError(t, e?.message ?? ''));
    }
  }, [group, t]);

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
    reload,
  };
}

// ── useMetadataServer ────────────────────────────────────────────────────────
// The metadata server section (a :external-metadata-server group + its URLs). Mirrors useServer
// almost 1:1, plus the per-URL "link to a server URL" association. Optional: nothing renders
// until the user adds one, and it only makes sense once a server exists (a metadata server is
// linked to a server group). `linkedServerGroups`/`urlsOfServerGroup` feed the link picker.

export interface UseMetadataServerResult {
  loading: boolean;

  providers: ProviderInfo[];
  group: ExternalMetadataGroupInfo | null;
  credentials: ServerCredentials;
  maskedCredential: (field: string) => string | null;
  addServer: (name: string, credentials: ServerCredentials, firstUrl: string) => Promise<string | null>;
  updateServer: (name: string, credentials: ServerCredentials) => Promise<string | null>;
  removeServer: () => Promise<void>;

  urls: ExternalMetadataUrlInfo[];
  activeUrlId: string | null;
  canAddUrl: boolean;
  canRemoveUrl: boolean;
  nextPriority: number;
  // urlId -> the server URL it's linked to (its address), for the "↳ …" sub-line under the row.
  // Absent when a metadata URL isn't associated with any server URL.
  linkedUrlLabel: (urlId: string) => string | undefined;
  addUrl: (url: string, priority: number, linkedServerUrlId?: string) => Promise<string | null>;
  updateUrl: (
    urlId: string,
    url: string,
    priority: number,
    linkedServerUrlId?: string,
  ) => Promise<string | null>;
  removeUrl: (urlId: string) => Promise<void>;
  testUrl: (url: string) => Promise<UrlProbeResult>;

  connStatus: ConnStatus;
  connMessage: string;
  testConnection: () => Promise<void>;

  // For the "link this URL to a server URL" picker in the URL modal.
  linkedServerGroups: ServerGroupInfo[];
  urlsOfServerGroup: (serverGroupId: string) => Promise<ServerUrlInfo[]>;

  reload: () => Promise<void>;
}

export function useMetadataServer(): UseMetadataServerResult {
  const t = useStrings();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [group, setGroup] = useState<ExternalMetadataGroupInfo | null>(null);
  const [urls, setUrls] = useState<ExternalMetadataUrlInfo[]>([]);
  const [activeUrlId, setActiveUrlId] = useState<string | null>(null);
  const [linkedServerGroups, setLinkedServerGroups] = useState<ServerGroupInfo[]>([]);
  // serverUrlId -> its address, so a metadata URL's linkedServerUrlId can be shown as text.
  const [serverUrlAddrById, setServerUrlAddrById] = useState<Record<string, string>>({});
  const [connStatus, setConnStatus] = useState<ConnStatus>('idle');
  const [connMessage, setConnMessage] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [prov, groups, serverGroups] = await Promise.all([
        ExternalsService.providers.list(),
        ExternalsService.groups.list(),
        ServersService.groups.list(),
      ]);
      setProviders(prov);
      setLinkedServerGroups(serverGroups);

      // Every server URL's address, keyed by id — for resolving a metadata URL's link to text.
      const serverUrlLists = await Promise.all(
        serverGroups.map(sg => ServerService.urls.list({ groupId: sg.id }).catch(() => [])),
      );
      const addrById: Record<string, string> = {};
      serverUrlLists.flat().forEach(u => {
        addrById[u.id] = u.url;
      });
      setServerUrlAddrById(addrById);

      let g = groups[0] ?? null;

      // One-time repair: a metadata group created by an earlier build stored the wrong
      // healthCheckPath ('/health', which 404s → the group never resolved). Bring it in line with
      // the provider's real liveness path (now that the provider reports one). Drops out once no
      // stale group can exist.
      const providerPath = prov[0]?.defaultHealthCheckPath;
      // MMR-DIAG (backlog 015-telemetria-interna-debug): metadata-group resolution trace. The
      // "Unknown providerId" case (a group created before the provider was renamed to "m3") was
      // diagnosed here — kept commented for the next time the dot stays grey.
      // console.log(
      //   '[MMR-DIAG] meta reload: providerPath=%s groupPath=%s groupId=%s',
      //   providerPath, g?.healthCheckPath, g?.id,
      // );
      if (g && providerPath && g.healthCheckPath !== providerPath) {
        // console.log('[MMR-DIAG] meta reload: auto-repairing healthCheckPath → %s', providerPath);
        g =
          (await ExternalService.group
            .update({ groupId: g.id, healthCheckPath: providerPath })
            .catch(() => g)) ?? g;
      }
      setGroup(g);

      if (g) {
        // :external-metadata-server has no boot-time activation (unlike :server, which the splash
        // activates), so getActive() is null until something resolves the group in this session.
        // Activate it here so the "connected" dot reflects reality on entry — it reuses the
        // session if there is one and is a no-op for an auth-less provider. Swallowed: if no URL
        // answers, the dot just stays grey, which is honest.
        await ExternalService.group.active.set({ groupId: g.id }).catch(() => {
          // console.log('[MMR-DIAG] meta reload: group.active.set threw', e?.message ?? e);
        });
        const [groupUrls, active] = await Promise.all([
          ExternalService.urls.list({ groupId: g.id }),
          ExternalService.urls.active.get({ groupId: g.id }).catch(() => null),
        ]);
        // console.log(
        //   '[MMR-DIAG] meta reload: urls=%o activeUrlId=%s',
        //   groupUrls.map(u => u.url), active?.id ?? null,
        // );
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

  // Cascade: when the server's active URL moves, the linked metadata group may resolve to a
  // different endpoint — re-activate it and refresh this section. No-op / grey dot if there's no
  // metadata group or none of its URLs answer. This never emits ServerEvents.activeUrlChanged, so
  // there's no loop.
  useEvent(ServerEvents.activeUrlChanged, () => {
    reload();
  });

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

  // A metadata server is linked to the (single) server group — pass the first one.
  const linkedServerGroupId = linkedServerGroups[0]?.id;

  const addServer = useCallback(
    async (name: string, creds: ServerCredentials, firstUrl: string): Promise<string | null> => {
      const provider = providers[0];
      if (!provider) {return t.serverErrorNoMetadataProvider;}
      try {
        const created = await ExternalService.group.add({
          name: name.trim(),
          providerId: provider.id,
          credentialsJson: JSON.stringify(creds),
          healthCheckPath: provider.defaultHealthCheckPath,
          linkedServerGroupId,
        });
        await ExternalService.urls.add({
          groupId: created.id,
          url: firstUrl.trim(),
          timeoutMs: DEFAULT_URL_TIMEOUT_MS,
          priority: 0,
        });
        await reload();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },
    [providers, linkedServerGroupId, reload, t],
  );

  const updateServer = useCallback(
    async (name: string, creds: ServerCredentials): Promise<string | null> => {
      if (!group) {return t.serverErrorNoMetadataServerToEdit;}
      try {
        await ExternalService.group.update({
          groupId: group.id,
          name: name.trim(),
          credentialsJson: JSON.stringify(creds),
        });
        await reload();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },
    [group, reload, t],
  );

  const removeServer = useCallback(async () => {
    if (!group) {return;}
    await ExternalService.group.remove({ groupId: group.id });
    await reload();
  }, [group, reload]);

  const canAddUrl = urls.length < MAX_URLS_PER_GROUP;
  const canRemoveUrl = urls.length > 1;
  const nextPriority = urls.length === 0 ? 0 : Math.max(...urls.map(u => u.priority)) + 1;

  const linkedUrlLabel = useCallback(
    (urlId: string): string | undefined => {
      const linkedId = urls.find(u => u.id === urlId)?.linkedServerUrlId;
      return linkedId ? serverUrlAddrById[linkedId] : undefined;
    },
    [urls, serverUrlAddrById],
  );

  const addUrl = useCallback(
    async (url: string, priority: number, linkedServerUrlId?: string): Promise<string | null> => {
      if (!group) {return t.serverErrorNoMetadataServer;}
      try {
        await ExternalService.urls.add({
          groupId: group.id,
          url: url.trim(),
          timeoutMs: DEFAULT_URL_TIMEOUT_MS,
          priority: Math.max(0, priority),
          linkedServerUrlId,
        });
        await reload();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },
    [group, reload, t],
  );

  const updateUrl = useCallback(
    async (
      urlId: string,
      url: string,
      priority: number,
      linkedServerUrlId?: string,
    ): Promise<string | null> => {
      if (!group) {return t.serverErrorNoMetadataServer;}
      try {
        await ExternalService.urls.update({
          groupId: group.id,
          urlId,
          url: url.trim(),
          priority: Math.max(0, priority),
          linkedServerUrlId,
        });
        await reload();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },
    [group, reload, t],
  );

  const removeUrl = useCallback(
    async (urlId: string) => {
      if (!group || urls.length <= 1) {return;}
      await ExternalService.urls.remove({ groupId: group.id, urlId });
      await reload();
    },
    [group, urls.length, reload],
  );

  const testUrl = useCallback(
    async (url: string): Promise<UrlProbeResult> => {
      if (!group) {return { url, ok: false, status: null, elapsedMs: 0 };}
      return ExternalService.urls.test({ groupId: group.id, url: url.trim() });
    },
    [group],
  );

  const testConnection = useCallback(async () => {
    if (!group) {return;}
    setConnStatus('testing');
    setConnMessage('');
    try {
      const winner = await ExternalService.urls.validate({ groupId: group.id });
      setConnStatus('ok');
      setConnMessage(winner.url);
      setActiveUrlId(winner.id);
    } catch (e: any) {
      setConnStatus('error');
      setConnMessage(friendlyConnError(t, e?.message ?? ''));
    }
  }, [group, t]);

  const urlsOfServerGroup = useCallback(
    (serverGroupId: string) => ServerService.urls.list({ groupId: serverGroupId }),
    [],
  );

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
    linkedUrlLabel,
    addUrl,
    updateUrl,
    removeUrl,
    testUrl,
    connStatus,
    connMessage,
    testConnection,
    linkedServerGroups,
    urlsOfServerGroup,
    reload,
  };
}
