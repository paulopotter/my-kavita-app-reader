import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type {
  NotificationGroupInfo,
  NotificationServiceStatus,
  NotificationUrlInfo,
  ServerGroupInfo,
  ServerUrlInfo,
  UrlProbeResult,
} from '../../../shared/bridge';
import { NotificationsEventEmitter } from '../../../shared/bridge';
import { useStrings } from '../../../shared/i18n';
import type { Strings } from '../../../shared/i18n';
import { NotificationsService } from '../../../shared/services/notifications';
import { ServerService, ServersService } from '../../../shared/services/servers';
import type { ConnStatus } from './notifications.types';

const DEFAULT_URL_TIMEOUT_MS = 5000;
export const MAX_URLS_PER_GROUP = 2;
export const MAX_GROUPS = 1;
export const RETENTION_MIN_DAYS = 1;
export const RETENTION_MAX_DAYS = 15;
export const RETENTION_DEFAULT_DAYS = 7;

// The channel row's read-only state (Decision 10 — see README): there is no writable "enabled"
// anywhere in this hook, only a re-read of the real Android channel, refreshed whenever the app
// comes back to foreground (the user may have just returned from the system settings screen the
// hook's openChannelSettings() sends them to).
export interface UseNotificationChannelResult {
  enabled: boolean | null; // null until the first read resolves
  openSettings: () => void;
}

export function useNotificationChannel(): UseNotificationChannelResult {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  const reload = useCallback(() => {
    NotificationsService.channel.isEnabled().then(setEnabled).catch(() => setEnabled(null));
  }, []);

  useEffect(() => {
    reload();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {reload();}
    });
    return () => sub.remove();
  }, [reload]);

  const openSettings = useCallback(() => {
    NotificationsService.channel.openSettings().catch(() => {});
  }, []);

  return { enabled, openSettings };
}

// The foreground service's own live connection status — read once on mount, then kept live via
// "connectionStatusChanged" (native-origin, fired by NotificationConnectionService itself, see
// its own doc), never polled. Mirrors useNotificationChannel's "re-read on foreground" idea, but
// this one updates itself in real time instead of only reacting to AppState.
export interface UseNotificationServiceStatusResult {
  status: NotificationServiceStatus | null; // null until the first read resolves
}

export function useNotificationServiceStatus(): UseNotificationServiceStatusResult {
  const [status, setStatus] = useState<NotificationServiceStatus | null>(null);

  useEffect(() => {
    NotificationsService.connection.getStatus().then(setStatus).catch(() => setStatus(null));
    const sub = NotificationsEventEmitter.addListener('connectionStatusChanged', (next: NotificationServiceStatus) => {
      setStatus(next);
    });
    return () => sub.remove();
  }, []);

  return { status };
}

// The 4 preference-backed toggles/setting below the channel row: scope (scopeAll one-directionally
// locks scopeFollowedOnly off — turning scopeFollowedOnly on never touches scopeAll, see README
// Decision 6), cross-series grouping, retention days.
export interface UseNotificationPrefsResult {
  loading: boolean;
  scopeAll: boolean;
  scopeFollowedOnly: boolean;
  groupAcrossSeries: boolean;
  retentionDays: number;
  setScopeAll: (enabled: boolean) => void;
  setScopeFollowedOnly: (enabled: boolean) => void;
  setGroupAcrossSeries: (enabled: boolean) => void;
  setRetentionDays: (days: number) => void;
}

export function useNotificationPrefs(): UseNotificationPrefsResult {
  const [loading, setLoading] = useState(true);
  const [scopeAll, setScopeAllState] = useState(false);
  const [scopeFollowedOnly, setScopeFollowedOnlyState] = useState(false);
  const [groupAcrossSeries, setGroupAcrossSeriesState] = useState(false);
  const [retentionDays, setRetentionDaysState] = useState(RETENTION_DEFAULT_DAYS);

  useEffect(() => {
    Promise.all([
      NotificationsService.scope.getAll(),
      NotificationsService.scope.getFollowedOnly(),
      NotificationsService.groupAcrossSeries.get(),
      NotificationsService.retentionDays.get(),
    ])
      .then(([all, followedOnly, grouped, retention]) => {
        setScopeAllState(all);
        setScopeFollowedOnlyState(followedOnly);
        setGroupAcrossSeriesState(grouped);
        setRetentionDaysState(retention ?? RETENTION_DEFAULT_DAYS);
      })
      .finally(() => setLoading(false));
  }, []);

  // Only scopeAll locks scopeFollowedOnly off (README Decision 6) — turning scopeFollowedOnly on
  // never touches scopeAll, since "all series" already implies every followed series too; the
  // reverse would be the actual bug (blocking a broader scope because a narrower one is on).
  const setScopeAll = useCallback((enabled: boolean) => {
    setScopeAllState(enabled);
    if (enabled) {setScopeFollowedOnlyState(false);}
    NotificationsService.scope.setAll({ enabled }).catch(() => {});
    if (enabled) {NotificationsService.scope.setFollowedOnly({ enabled: false }).catch(() => {});}
  }, []);

  const setScopeFollowedOnly = useCallback((enabled: boolean) => {
    setScopeFollowedOnlyState(enabled);
    NotificationsService.scope.setFollowedOnly({ enabled }).catch(() => {});
  }, []);

  const setGroupAcrossSeries = useCallback((enabled: boolean) => {
    setGroupAcrossSeriesState(enabled);
    NotificationsService.groupAcrossSeries.set({ enabled }).catch(() => {});
  }, []);

  const setRetentionDays = useCallback((days: number) => {
    const clamped = Math.min(RETENTION_MAX_DAYS, Math.max(RETENTION_MIN_DAYS, days));
    setRetentionDaysState(clamped);
    NotificationsService.retentionDays.set({ days: clamped }).catch(() => {});
  }, []);

  return {
    loading,
    scopeAll,
    scopeFollowedOnly,
    groupAcrossSeries,
    retentionDays,
    setScopeAll,
    setScopeFollowedOnly,
    setGroupAcrossSeries,
    setRetentionDays,
  };
}

// The notification-server group section — same CRUD shape as useServer/useMetadataServer
// (config/server/): single-group rule (MAX_GROUPS), active-URL tracking, per-URL test, and the
// "link to a Kavita server" association (group-level linkedServerGroupId, URL-level
// linkedServerUrlId) — mirrors ExternalMetadataServer's own two-level link.
export interface UseNotificationGroupsResult {
  loading: boolean;
  group: NotificationGroupInfo | null;
  canAddGroup: boolean;
  addGroup: (name: string, topic: string, linkedServerGroupId: string | undefined) => Promise<string | null>;
  editGroup: (name: string, topic: string, linkedServerGroupId: string | undefined) => Promise<string | null>;
  removeGroup: (groupId: string) => Promise<void>;

  urls: NotificationUrlInfo[];
  activeUrlId: string | null;
  canAddUrl: boolean;
  canRemoveUrl: boolean; // false when only one URL remains
  nextPriority: number;
  // urlId -> the server URL it's linked to (its address), for the "↳ …" sub-line under the row.
  // Absent when a notification URL isn't associated with any server URL. Mirrors
  // useMetadataServer's own linkedUrlLabel.
  linkedUrlLabel: (urlId: string) => string | undefined;
  addUrl: (url: string, priority: number, linkedServerUrlId: string | undefined) => Promise<string | null>;
  updateUrl: (urlId: string, url: string, priority: number, linkedServerUrlId: string | undefined) => Promise<string | null>;
  removeUrl: (urlId: string) => Promise<void>;
  testUrl: (url: string) => Promise<UrlProbeResult>;

  // Group-level connection test — same idiom as useServer/useMetadataServer's own testConnection:
  // probes every configured URL and reports the one that answered (which also becomes the active
  // URL). connMessage carries the winning URL on success, or a friendly error message on failure.
  connStatus: ConnStatus;
  connMessage: string;
  testConnection: () => Promise<void>;

  // For the "link this URL to a server URL" picker in the URL modal, and the group modal's own
  // "link to a server" picker.
  linkedServerGroups: ServerGroupInfo[];
  urlsOfServerGroup: (serverGroupId: string) => Promise<ServerUrlInfo[]>;

  reload: () => Promise<void>;
}

const NTFY_PROVIDER_ID = 'ntfy';

export function useNotificationGroups(): UseNotificationGroupsResult {
  const t = useStrings();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<NotificationGroupInfo | null>(null);
  const [urls, setUrls] = useState<NotificationUrlInfo[]>([]);
  const [activeUrlId, setActiveUrlId] = useState<string | null>(null);
  const [connStatus, setConnStatus] = useState<ConnStatus>('idle');
  const [connMessage, setConnMessage] = useState('');
  const [linkedServerGroups, setLinkedServerGroups] = useState<ServerGroupInfo[]>([]);
  // serverUrlId -> its address, so a notification URL's link can be shown as text (the "↳ …"
  // sub-line under its row) — mirrors useMetadataServer's own serverUrlAddrById.
  const [serverUrlAddrById, setServerUrlAddrById] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [groups, serverGroups] = await Promise.all([NotificationsService.groups.list(), ServersService.groups.list()]);
      setLinkedServerGroups(serverGroups);

      const serverUrlLists = await Promise.all(
        serverGroups.map(sg => ServerService.urls.list({ groupId: sg.id }).catch(() => [])),
      );
      const addrById: Record<string, string> = {};
      serverUrlLists.flat().forEach(u => {
        addrById[u.id] = u.url;
      });
      setServerUrlAddrById(addrById);

      const g = groups[0] ?? null; // single-group rule — this screen only ever shows groups[0]
      setGroup(g);

      if (g) {
        const [groupUrls, active] = await Promise.all([
          NotificationsService.groups.urls.list({ groupId: g.id }),
          NotificationsService.groups.getActiveUrl().catch(() => null),
        ]);
        setUrls([...groupUrls].sort((a, b) => a.priority - b.priority));
        setActiveUrlId(active && active.groupId === g.id ? active.urlId : null);
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

  const canAddGroup = group == null;

  const addGroup = useCallback(
    async (name: string, topic: string, linkedServerGroupId: string | undefined): Promise<string | null> => {
      if (!name.trim()) {return t.notificationsErrorGroupNameRequired;}
      if (!topic.trim()) {return t.notificationsErrorTopicRequired;}
      try {
        await NotificationsService.groups.add({ name: name.trim(), providerId: NTFY_PROVIDER_ID, topic: topic.trim(), linkedServerGroupId });
        await reload();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },
    [reload, t],
  );

  const editGroup = useCallback(
    async (name: string, topic: string, linkedServerGroupId: string | undefined): Promise<string | null> => {
      if (!group) {return t.notificationsErrorNoGroup;}
      if (!name.trim()) {return t.notificationsErrorGroupNameRequired;}
      if (!topic.trim()) {return t.notificationsErrorTopicRequired;}
      try {
        await NotificationsService.groups.update({
          groupId: group.id,
          name: name.trim(),
          topic: topic.trim(),
          linkedServerGroupId,
        });
        await reload();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },
    [group, reload, t],
  );

  const removeGroup = useCallback(
    async (groupId: string) => {
      await NotificationsService.groups.remove({ groupId });
      await reload();
    },
    [reload],
  );

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
    async (url: string, priority: number, linkedServerUrlId: string | undefined): Promise<string | null> => {
      if (!group) {return t.notificationsErrorNoGroup;}
      try {
        await NotificationsService.groups.urls.add({
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
    async (urlId: string, url: string, priority: number, linkedServerUrlId: string | undefined): Promise<string | null> => {
      if (!group) {return t.notificationsErrorNoGroup;}
      try {
        await NotificationsService.groups.urls.update({
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
      if (!group || urls.length <= 1) {return;} // a group must keep at least one URL
      await NotificationsService.groups.urls.remove({ groupId: group.id, urlId });
      await reload();
    },
    [group, urls.length, reload],
  );

  const testUrl = useCallback(
    async (url: string): Promise<UrlProbeResult> => {
      if (!group) {return { url, ok: false, status: null, elapsedMs: 0 };}
      return NotificationsService.groups.urls.test({ groupId: group.id, url: url.trim() });
    },
    [group],
  );

  const urlsOfServerGroup = useCallback(
    (serverGroupId: string) => ServerService.urls.list({ groupId: serverGroupId }),
    [],
  );

  // Group-level connection test — same idiom as useServer/useMetadataServer's own testConnection:
  // probes every configured URL and reports the one that answered (which also becomes the active
  // URL, same as NotificationsService.groups.urls.validate would on the Kotlin side).
  const testConnection = useCallback(async () => {
    if (!group) {return;}
    setConnStatus('testing');
    setConnMessage('');
    try {
      const winner = await NotificationsService.groups.testConnection({ groupId: group.id });
      setConnStatus('ok');
      setConnMessage(winner.url);
      setActiveUrlId(winner.id);
    } catch (e) {
      setConnStatus('error');
      setConnMessage(e instanceof Error ? e.message : String(e));
    }
  }, [group]);

  return {
    loading,
    group,
    canAddGroup,
    addGroup,
    editGroup,
    removeGroup,
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

export type { Strings };
