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

export interface NotificationHistoryItem {
  id: string;
  seriesId: string;
  seriesName: string;
  chapterIds?: string[];
  chapterNumbers?: string[];
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

  // scope/grouping/retention preferences
  getScopeAll(): Promise<boolean>;
  setScopeAll(params: { enabled: boolean }): Promise<void>;
  getScopeFollowedOnly(): Promise<boolean>;
  setScopeFollowedOnly(params: { enabled: boolean }): Promise<void>;
  getGroupAcrossSeries(): Promise<boolean>;
  setGroupAcrossSeries(params: { enabled: boolean }): Promise<void>;
  getRetentionDays(): Promise<number | null>;
  setRetentionDays(params: { days: number }): Promise<void>;

  // history
  listHistory(): Promise<NotificationHistoryItem[]>;
  markHistoryRead(params: { id: string }): Promise<void>;
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
  getScopeAll(): Promise<boolean>;
  setScopeAll(enabled: boolean): Promise<void>;
  getScopeFollowedOnly(): Promise<boolean>;
  setScopeFollowedOnly(enabled: boolean): Promise<void>;
  getGroupAcrossSeries(): Promise<boolean>;
  setGroupAcrossSeries(enabled: boolean): Promise<void>;
  getRetentionDays(): Promise<number | null>;
  setRetentionDays(days: number): Promise<void>;
  listHistory(): Promise<NotificationHistoryItem[]>;
  markHistoryRead(id: string): Promise<void>;
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

  getScopeAll: () => native.getScopeAll(),
  setScopeAll: ({ enabled }) => native.setScopeAll(enabled),
  getScopeFollowedOnly: () => native.getScopeFollowedOnly(),
  setScopeFollowedOnly: ({ enabled }) => native.setScopeFollowedOnly(enabled),
  getGroupAcrossSeries: () => native.getGroupAcrossSeries(),
  setGroupAcrossSeries: ({ enabled }) => native.setGroupAcrossSeries(enabled),
  getRetentionDays: () => native.getRetentionDays(),
  setRetentionDays: ({ days }) => native.setRetentionDays(days),

  listHistory: () => native.listHistory(),
  markHistoryRead: ({ id }) => native.markHistoryRead(id),
  markAllHistoryRead: () => native.markAllHistoryRead(),
  deleteHistoryItem: ({ id }) => native.deleteHistoryItem(id),
  unreadCount: () => native.unreadCount(),
};

// Native-origin events (Kotlin observes/decides these on its own, never a response to an RN
// request) — mechanism 2 of the 3 documented in architecture.md.
export const NotificationsEventEmitter = new NativeEventEmitter(NativeModules.NotificationsBridgeModule);
