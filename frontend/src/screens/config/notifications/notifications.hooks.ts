import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { NotificationGroupInfo, NotificationUrlInfo } from '../../../shared/bridge';
import { useStrings } from '../../../shared/i18n';
import type { Strings } from '../../../shared/i18n';
import { NotificationsService } from '../../../shared/services/notifications';

const DEFAULT_URL_TIMEOUT_MS = 5000;
export const MAX_URLS_PER_GROUP = 2;

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

// The 4 preference-backed toggles/setting below the channel row: scope (mutually exclusive
// all/followed-only — UI-only exclusivity, see README Decision 6), cross-series grouping,
// retention days.
export interface UseNotificationPrefsResult {
  loading: boolean;
  scopeAll: boolean;
  scopeFollowedOnly: boolean;
  groupAcrossSeries: boolean;
  retentionDays: number | null;
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
  const [retentionDays, setRetentionDaysState] = useState<number | null>(null);

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
        setRetentionDaysState(retention);
      })
      .finally(() => setLoading(false));
  }, []);

  // scopeAll and scopeFollowedOnly are mutually exclusive in this screen's own state only (README
  // Decision 6) — turning one on turns the other off and locks it until the active one goes back
  // off. Neither the bridge nor NotificationResolver knows about this exclusivity.
  const setScopeAll = useCallback((enabled: boolean) => {
    setScopeAllState(enabled);
    if (enabled) {setScopeFollowedOnlyState(false);}
    NotificationsService.scope.setAll({ enabled }).catch(() => {});
    if (enabled) {NotificationsService.scope.setFollowedOnly({ enabled: false }).catch(() => {});}
  }, []);

  const setScopeFollowedOnly = useCallback((enabled: boolean) => {
    setScopeFollowedOnlyState(enabled);
    if (enabled) {setScopeAllState(false);}
    NotificationsService.scope.setFollowedOnly({ enabled }).catch(() => {});
    if (enabled) {NotificationsService.scope.setAll({ enabled: false }).catch(() => {});}
  }, []);

  const setGroupAcrossSeries = useCallback((enabled: boolean) => {
    setGroupAcrossSeriesState(enabled);
    NotificationsService.groupAcrossSeries.set({ enabled }).catch(() => {});
  }, []);

  const setRetentionDays = useCallback((days: number) => {
    setRetentionDaysState(days);
    NotificationsService.retentionDays.set({ days }).catch(() => {});
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

// The notification-server groups section — same CRUD shape as useServer/useMetadataServer
// (config/server/), minus credentials/health-check/connection-test, which ntfy-style groups
// don't have.
export interface UseNotificationGroupsResult {
  loading: boolean;
  groups: NotificationGroupInfo[];
  addGroup: (name: string, topic: string) => Promise<string | null>;
  removeGroup: (groupId: string) => Promise<void>;

  urlsByGroup: Record<string, NotificationUrlInfo[]>;
  canAddUrl: (groupId: string) => boolean;
  canRemoveUrl: (groupId: string) => boolean; // false when only one URL remains
  nextPriority: (groupId: string) => number;
  addUrl: (groupId: string, url: string, priority: number) => Promise<string | null>;
  removeUrl: (groupId: string, urlId: string) => Promise<void>;

  reload: () => Promise<void>;
}

const NTFY_PROVIDER_ID = 'ntfy';

export function useNotificationGroups(): UseNotificationGroupsResult {
  const t = useStrings();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<NotificationGroupInfo[]>([]);
  const [urlsByGroup, setUrlsByGroup] = useState<Record<string, NotificationUrlInfo[]>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await NotificationsService.groups.list();
      setGroups(list);
      const urlLists = await Promise.all(
        list.map(g => NotificationsService.groups.urls.list({ groupId: g.id }).catch(() => [])),
      );
      const byGroup: Record<string, NotificationUrlInfo[]> = {};
      list.forEach((g, i) => {
        byGroup[g.id] = [...urlLists[i]].sort((a, b) => a.priority - b.priority);
      });
      setUrlsByGroup(byGroup);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addGroup = useCallback(
    async (name: string, topic: string): Promise<string | null> => {
      if (!name.trim()) {return t.notificationsErrorGroupNameRequired;}
      if (!topic.trim()) {return t.notificationsErrorTopicRequired;}
      try {
        await NotificationsService.groups.add({ name: name.trim(), providerId: NTFY_PROVIDER_ID, topic: topic.trim() });
        await reload();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },
    [reload, t],
  );

  const removeGroup = useCallback(
    async (groupId: string) => {
      await NotificationsService.groups.remove({ groupId });
      await reload();
    },
    [reload],
  );

  const canAddUrl = useCallback((groupId: string) => (urlsByGroup[groupId]?.length ?? 0) < MAX_URLS_PER_GROUP, [urlsByGroup]);
  const canRemoveUrl = useCallback((groupId: string) => (urlsByGroup[groupId]?.length ?? 0) > 1, [urlsByGroup]);
  const nextPriority = useCallback((groupId: string) => {
    const urls = urlsByGroup[groupId] ?? [];
    return urls.length === 0 ? 0 : Math.max(...urls.map(u => u.priority)) + 1;
  }, [urlsByGroup]);

  const addUrl = useCallback(
    async (groupId: string, url: string, priority: number): Promise<string | null> => {
      if (!groups.some(g => g.id === groupId)) {return t.notificationsErrorNoGroup;}
      try {
        await NotificationsService.groups.urls.add({
          groupId,
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
    [groups, reload, t],
  );

  const removeUrl = useCallback(
    async (groupId: string, urlId: string) => {
      if ((urlsByGroup[groupId]?.length ?? 0) <= 1) {return;} // a group must keep at least one URL
      await NotificationsService.groups.urls.remove({ groupId, urlId });
      await reload();
    },
    [urlsByGroup, reload],
  );

  return {
    loading,
    groups,
    addGroup,
    removeGroup,
    urlsByGroup,
    canAddUrl,
    canRemoveUrl,
    nextPriority,
    addUrl,
    removeUrl,
    reload,
  };
}

export type { Strings };
