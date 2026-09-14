import { NativeEventEmitter, NativeModules } from 'react-native';
import type { UrlProbeResult } from './server';

// Mirrors :notifications' Notifications facade (android/notifications) via
// NotificationsBridgeModule.kt — groups/URL CRUD, the channel-backed enabled state, scope/
// grouping/retention preferences, and history CRUD (Plan 008 Task 007).

export interface NotificationGroupInfo {
  id: string;
  name: string;
  providerId: string;
  topic: string;
  linkedServerGroupId?: string;
}

export interface NotificationUrlInfo {
  id: string;
  groupId: string;
  url: string;
  timeoutMs: number;
  priority: number;
  linkedServerUrlId?: string;
}

// One row per CHAPTER, always — a publisher event carrying N chapters together is exploded into
// N of these before it ever reaches Room (NotificationResolver's own explode step, Kotlin-side —
// see NotificationHistoryEntity's own doc). Never more than one chapter per row; a row with
// neither field only happens when the publisher's own event carried no chapter detail at all.
export interface NotificationHistoryItem {
  id: string;
  seriesId: string;
  seriesName: string;
  chapterId?: string;
  chapterNumber?: string;
  detectedAtMs: number;
  read: boolean;
  createdAtLocalMs: number;
}

// Which group/URL the foreground service is actually connected to right now — null when nothing
// resolved (e.g. no healthy URL, or the service isn't running).
export interface NotificationActiveGroupUrl {
  groupId: string;
  urlId: string;
}

export interface UnreadCountChangedEvent {
  count: number;
}

// The foreground service's own connection status — 'stopped' when it isn't running at all (never
// started, or explicitly stopped because the config no longer needs it); the other three mirror
// the underlying plugin's own connectionState once the service has started. Carried both by
// getConnectionStatus() (a point-in-time read) and the "connectionStatusChanged" event (fired
// live by the service itself, no polling needed).
export type NotificationServiceStatus = 'stopped' | 'connecting' | 'connected' | 'disconnected';

// Every method here takes a single named-argument object (never positional params), same
// convention as PreferencesBridge/CacheBridge — the underlying Kotlin @ReactMethods stay
// positional.
interface NotificationsBridgeModuleInterface {
  // channel-backed enabled state
  isChannelEnabled(): Promise<boolean>;
  openChannelSettings(): Promise<void>;

  // groups
  listGroups(): Promise<NotificationGroupInfo[]>;
  addGroup(params: { name: string; providerId: string; topic: string; linkedServerGroupId?: string }): Promise<NotificationGroupInfo>;
  updateGroup(params: { groupId: string; name?: string; topic?: string; linkedServerGroupId?: string }): Promise<NotificationGroupInfo>;
  removeGroup(params: { groupId: string }): Promise<void>;
  listGroupUrls(params: { groupId: string }): Promise<NotificationUrlInfo[]>;
  addGroupUrl(params: {
    groupId: string;
    url: string;
    timeoutMs: number;
    priority: number;
    linkedServerUrlId?: string;
  }): Promise<NotificationUrlInfo>;
  updateGroupUrl(params: {
    groupId: string;
    urlId: string;
    url?: string;
    timeoutMs?: number;
    priority?: number;
    linkedServerUrlId?: string;
  }): Promise<NotificationUrlInfo>;
  removeGroupUrl(params: { groupId: string; urlId: string }): Promise<void>;
  testGroupUrl(params: { groupId: string; url: string }): Promise<UrlProbeResult>;
  getActiveGroupUrl(): Promise<NotificationActiveGroupUrl | null>;
  getConnectionStatus(): Promise<NotificationServiceStatus>;
  testGroupConnection(params: { groupId: string }): Promise<NotificationUrlInfo>;

  // scope/grouping/retention preferences
  getScopeAll(): Promise<boolean>;
  setScopeAll(params: { enabled: boolean }): Promise<void>;
  getScopeFollowedOnly(): Promise<boolean>;
  setScopeFollowedOnly(params: { enabled: boolean }): Promise<void>;
  getGroupAcrossSeries(): Promise<boolean>;
  setGroupAcrossSeries(params: { enabled: boolean }): Promise<void>;
  getRetentionDays(): Promise<number | null>;
  setRetentionDays(params: { days: number }): Promise<void>;
  // Presentation-only, this screen's own history list — never touches storage (every row is
  // always kept separately, see NotificationHistoryItem's own doc) nor the system tray. When
  // true, rows for the same series within getCollapseWindowMs() of each other are visually
  // collapsed into one entry.
  getCollapseSerialChaptersNotification(): Promise<boolean>;
  setCollapseSerialChaptersNotification(params: { enabled: boolean }): Promise<void>;
  // Build-time only (COLLAPSE_WINDOW_MS, android/app/build.gradle.kts) — no setter, not a user
  // preference.
  getCollapseWindowMs(): Promise<number>;

  // history
  listHistory(): Promise<NotificationHistoryItem[]>;
  markHistoryRead(params: { id: string }): Promise<void>;
  // Marking by what was consumed, not by row id — the caller reacts to a chapter/serial being
  // opened and never knows which row announced it. Correlation happens in SQL, Kotlin-side.
  markHistoryReadByChapter(params: { seriesId: string; chapterId: string }): Promise<void>;
  markHistorySerialRead(params: { seriesId: string }): Promise<void>;
  markAllHistoryRead(): Promise<void>;
  deleteHistoryItem(params: { id: string }): Promise<void>;
  unreadCount(): Promise<number>;
}

// The native module itself takes positional args — this thin object wraps each call so the rest
// of the RN codebase only ever sees the named-argument shape above.
const native: {
  isChannelEnabled(): Promise<boolean>;
  openChannelSettings(): Promise<void>;
  listGroups(): Promise<NotificationGroupInfo[]>;
  addGroup(name: string, providerId: string, topic: string, linkedServerGroupId: string | undefined): Promise<NotificationGroupInfo>;
  updateGroup(
    groupId: string,
    name: string | undefined,
    topic: string | undefined,
    linkedServerGroupId: string | undefined,
  ): Promise<NotificationGroupInfo>;
  removeGroup(groupId: string): Promise<void>;
  listGroupUrls(groupId: string): Promise<NotificationUrlInfo[]>;
  addGroupUrl(
    groupId: string,
    url: string,
    timeoutMs: number,
    priority: number,
    linkedServerUrlId: string | undefined,
  ): Promise<NotificationUrlInfo>;
  updateGroupUrl(
    groupId: string,
    urlId: string,
    url: string | undefined,
    timeoutMs: number,
    priority: number,
    linkedServerUrlId: string | undefined,
  ): Promise<NotificationUrlInfo>;
  removeGroupUrl(groupId: string, urlId: string): Promise<void>;
  testGroupUrl(groupId: string, url: string): Promise<UrlProbeResult>;
  getActiveGroupUrl(): Promise<NotificationActiveGroupUrl | null>;
  getConnectionStatus(): Promise<NotificationServiceStatus>;
  testGroupConnection(groupId: string): Promise<NotificationUrlInfo>;
  getScopeAll(): Promise<boolean>;
  setScopeAll(enabled: boolean): Promise<void>;
  getScopeFollowedOnly(): Promise<boolean>;
  setScopeFollowedOnly(enabled: boolean): Promise<void>;
  getGroupAcrossSeries(): Promise<boolean>;
  setGroupAcrossSeries(enabled: boolean): Promise<void>;
  getRetentionDays(): Promise<number | null>;
  setRetentionDays(days: number): Promise<void>;
  getCollapseSerialChaptersNotification(): Promise<boolean>;
  setCollapseSerialChaptersNotification(enabled: boolean): Promise<void>;
  getCollapseWindowMs(): Promise<number>;
  listHistory(): Promise<NotificationHistoryItem[]>;
  markHistoryRead(id: string): Promise<void>;
  markHistoryReadByChapter(seriesId: string, chapterId: string): Promise<void>;
  markHistorySerialRead(seriesId: string): Promise<void>;
  markAllHistoryRead(): Promise<void>;
  deleteHistoryItem(id: string): Promise<void>;
  unreadCount(): Promise<number>;
} = NativeModules.NotificationsBridgeModule;

export const NotificationsBridge: NotificationsBridgeModuleInterface = {
  isChannelEnabled: () => native.isChannelEnabled(),
  openChannelSettings: () => native.openChannelSettings(),

  listGroups: () => native.listGroups(),
  addGroup: ({ name, providerId, topic, linkedServerGroupId }) => native.addGroup(name, providerId, topic, linkedServerGroupId),
  updateGroup: ({ groupId, name, topic, linkedServerGroupId }) => native.updateGroup(groupId, name, topic, linkedServerGroupId),
  removeGroup: ({ groupId }) => native.removeGroup(groupId),
  listGroupUrls: ({ groupId }) => native.listGroupUrls(groupId),
  addGroupUrl: ({ groupId, url, timeoutMs, priority, linkedServerUrlId }) =>
    native.addGroupUrl(groupId, url, timeoutMs, priority, linkedServerUrlId),
  updateGroupUrl: ({ groupId, urlId, url, timeoutMs, priority, linkedServerUrlId }) =>
    native.updateGroupUrl(groupId, urlId, url, timeoutMs ?? -1, priority ?? -1, linkedServerUrlId),
  removeGroupUrl: ({ groupId, urlId }) => native.removeGroupUrl(groupId, urlId),
  testGroupUrl: ({ groupId, url }) => native.testGroupUrl(groupId, url),
  getActiveGroupUrl: () => native.getActiveGroupUrl(),
  getConnectionStatus: () => native.getConnectionStatus(),
  testGroupConnection: ({ groupId }) => native.testGroupConnection(groupId),

  getScopeAll: () => native.getScopeAll(),
  setScopeAll: ({ enabled }) => native.setScopeAll(enabled),
  getScopeFollowedOnly: () => native.getScopeFollowedOnly(),
  setScopeFollowedOnly: ({ enabled }) => native.setScopeFollowedOnly(enabled),
  getGroupAcrossSeries: () => native.getGroupAcrossSeries(),
  setGroupAcrossSeries: ({ enabled }) => native.setGroupAcrossSeries(enabled),
  getRetentionDays: () => native.getRetentionDays(),
  setRetentionDays: ({ days }) => native.setRetentionDays(days),
  getCollapseSerialChaptersNotification: () => native.getCollapseSerialChaptersNotification(),
  setCollapseSerialChaptersNotification: ({ enabled }) => native.setCollapseSerialChaptersNotification(enabled),
  getCollapseWindowMs: () => native.getCollapseWindowMs(),

  listHistory: () => native.listHistory(),
  markHistoryRead: ({ id }) => native.markHistoryRead(id),
  markHistoryReadByChapter: ({ seriesId, chapterId }) => native.markHistoryReadByChapter(seriesId, chapterId),
  markHistorySerialRead: ({ seriesId }) => native.markHistorySerialRead(seriesId),
  markAllHistoryRead: () => native.markAllHistoryRead(),
  deleteHistoryItem: ({ id }) => native.deleteHistoryItem(id),
  unreadCount: () => native.unreadCount(),
};

// Native-origin events (Kotlin observes/decides these on its own, never a response to an RN
// request) — mechanism 2 of the 3 documented in architecture.md.
export const NotificationsEventEmitter = new NativeEventEmitter(NativeModules.NotificationsBridgeModule);
