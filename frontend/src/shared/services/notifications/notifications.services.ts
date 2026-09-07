import {
  NotificationsBridge,
  type NotificationActiveGroupUrl,
  type NotificationGroupInfo,
  type NotificationHistoryItem,
  type NotificationServiceStatus,
  type NotificationUrlInfo,
  type UrlProbeResult,
} from '../../bridge';

// Layer 4 — thin wrapper over NotificationsBridge (Task 007). No cache, no transformation:
// callers get the raw shapes exactly as :notifications produced them. Namespaced by
// responsibility (channel/groups/scope/history) rather than a single flat object, mirroring
// ServerService's own group/urls/auth split.
//
// `channel` has no `enabled`-setter: Android does not let this app change an already-created
// channel's importance programmatically, only the user can from the system's own settings screen
// — see README Decision 10 / Task 007. `isEnabled()` is a read, `openSettings()` is the only
// "write" affordance, and it never touches app state at all.
export const NotificationsService = {
  channel: {
    isEnabled(): Promise<boolean> {
      return NotificationsBridge.isChannelEnabled();
    },
    openSettings(): Promise<void> {
      return NotificationsBridge.openChannelSettings();
    },
  },
  // The foreground service's own live status (stopped/connecting/connected/disconnected) — not
  // the same thing as the channel being enabled: the channel gates whether the service is allowed
  // to run at all, this is whether it's actually up and talking to the notification server right
  // now.
  connection: {
    getStatus(): Promise<NotificationServiceStatus> {
      return NotificationsBridge.getConnectionStatus();
    },
  },
  groups: {
    list(): Promise<NotificationGroupInfo[]> {
      return NotificationsBridge.listGroups();
    },
    add({
      name,
      providerId,
      topic,
      linkedServerGroupId,
    }: {
      name: string;
      providerId: string;
      topic: string;
      linkedServerGroupId?: string;
    }): Promise<NotificationGroupInfo> {
      return NotificationsBridge.addGroup({ name, providerId, topic, linkedServerGroupId });
    },
    update({
      groupId,
      name,
      topic,
      linkedServerGroupId,
    }: {
      groupId: string;
      name?: string;
      topic?: string;
      linkedServerGroupId?: string;
    }): Promise<NotificationGroupInfo> {
      return NotificationsBridge.updateGroup({ groupId, name, topic, linkedServerGroupId });
    },
    remove({ groupId }: { groupId: string }): Promise<void> {
      return NotificationsBridge.removeGroup({ groupId });
    },
    // Which group/URL the foreground service is actually connected to right now (null if nothing
    // resolved) — used to mark the active row, same as ServerService.urls.getActive's role.
    getActiveUrl(): Promise<NotificationActiveGroupUrl | null> {
      return NotificationsBridge.getActiveGroupUrl();
    },
    // Group-level connection test — tests every configured URL and reports the one that answered
    // (which also becomes the active URL). Mirrors ServerService.group.testConnection's role.
    testConnection({ groupId }: { groupId: string }): Promise<NotificationUrlInfo> {
      return NotificationsBridge.testGroupConnection({ groupId });
    },
    urls: {
      list({ groupId }: { groupId: string }): Promise<NotificationUrlInfo[]> {
        return NotificationsBridge.listGroupUrls({ groupId });
      },
      add({
        groupId,
        url,
        timeoutMs,
        priority,
        linkedServerUrlId,
      }: {
        groupId: string;
        url: string;
        timeoutMs: number;
        priority: number;
        linkedServerUrlId?: string;
      }): Promise<NotificationUrlInfo> {
        return NotificationsBridge.addGroupUrl({ groupId, url, timeoutMs, priority, linkedServerUrlId });
      },
      update({
        groupId,
        urlId,
        url,
        timeoutMs,
        priority,
        linkedServerUrlId,
      }: {
        groupId: string;
        urlId: string;
        url?: string;
        timeoutMs?: number;
        priority?: number;
        linkedServerUrlId?: string;
      }): Promise<NotificationUrlInfo> {
        return NotificationsBridge.updateGroupUrl({ groupId, urlId, url, timeoutMs, priority, linkedServerUrlId });
      },
      remove({ groupId, urlId }: { groupId: string; urlId: string }): Promise<void> {
        return NotificationsBridge.removeGroupUrl({ groupId, urlId });
      },
      // Point check on a typed-in URL — does not change which URL is active. Mirrors
      // ServerService.urls.test's role.
      test({ groupId, url }: { groupId: string; url: string }): Promise<UrlProbeResult> {
        return NotificationsBridge.testGroupUrl({ groupId, url });
      },
    },
  },
  scope: {
    getAll(): Promise<boolean> {
      return NotificationsBridge.getScopeAll();
    },
    setAll({ enabled }: { enabled: boolean }): Promise<void> {
      return NotificationsBridge.setScopeAll({ enabled });
    },
    getFollowedOnly(): Promise<boolean> {
      return NotificationsBridge.getScopeFollowedOnly();
    },
    setFollowedOnly({ enabled }: { enabled: boolean }): Promise<void> {
      return NotificationsBridge.setScopeFollowedOnly({ enabled });
    },
  },
  groupAcrossSeries: {
    get(): Promise<boolean> {
      return NotificationsBridge.getGroupAcrossSeries();
    },
    set({ enabled }: { enabled: boolean }): Promise<void> {
      return NotificationsBridge.setGroupAcrossSeries({ enabled });
    },
  },
  retentionDays: {
    get(): Promise<number | null> {
      return NotificationsBridge.getRetentionDays();
    },
    set({ days }: { days: number }): Promise<void> {
      return NotificationsBridge.setRetentionDays({ days });
    },
  },
  history: {
    list(): Promise<NotificationHistoryItem[]> {
      return NotificationsBridge.listHistory();
    },
    markRead({ id }: { id: string }): Promise<void> {
      return NotificationsBridge.markHistoryRead({ id });
    },
    markAllRead(): Promise<void> {
      return NotificationsBridge.markAllHistoryRead();
    },
    delete({ id }: { id: string }): Promise<void> {
      return NotificationsBridge.deleteHistoryItem({ id });
    },
    unreadCount(): Promise<number> {
      return NotificationsBridge.unreadCount();
    },
  },
};
