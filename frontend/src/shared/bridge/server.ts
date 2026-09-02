import { NativeModules } from 'react-native';
import type { ImageDescriptor } from './digest';

export interface ProviderInfo {
  id: string;
  displayName: string;
  version: string;
}

export interface ServerGroupInfo {
  id: string;
  name: string;
  providerId: string;
  credentialsJson: string;
  healthCheckPath: string;
}

export interface ServerUrlInfo {
  id: string;
  groupId: string;
  url: string;
  timeoutMs: number;
  priority: number;
}

// Mirrors Server.SerialData (Kotlin :server) 1:1 — the shape Server hands back from
// serials.list() / serial(id).get(). Server has already normalized the plugin's raw flat cover
// URL into a full `coverImage: ImageDescriptor` (the same type SeriesDigest.coverImage uses);
// a caller above the bridge never deals with a bare cover URL string.
export interface SerialData {
  id: string;
  name: string;
  coverImage: ImageDescriptor;
  pagesRead: number;
  totalPages: number;
  libraryId?: string;
  libraryName?: string;
  lastFolderScannedUtc?: string;
  lastChapterAddedUtc?: string;
  latestReadDateUtc?: string;
  originalName?: string;
  localizedName?: string;
  sortName?: string;
  aniListId?: number;
  malId?: number;
  primaryColor?: string;
  secondaryColor?: string;
}

// serials.list()'s payload — an object wrapper (not a bare array) so list-level metadata
// (paging, total…) has somewhere to land later. Mirrors Server.SerialListData (Kotlin).
export interface SerialListData {
  serials: SerialData[];
}

export interface PluginChapter {
  id: string;
  title: string;
  number?: string;
  pageCount: number;
  pagesRead: number;
  isSpecial: boolean;
}

export interface PluginProgress {
  pageIndex: number;
  updatedAtUtc?: string;
}

export interface PluginPageDimension {
  width: number;
  height: number;
}

interface ServerBridgeModuleInterface {
  // providers
  listProviders(): Promise<ProviderInfo[]>;

  // groups
  listGroups(): Promise<ServerGroupInfo[]>;
  getGroup(groupId: string): Promise<ServerGroupInfo | null>;
  addGroup(
    name: string,
    providerId: string,
    credentialsJson: string,
    healthCheckPath: string,
  ): Promise<ServerGroupInfo>;
  updateGroup(
    groupId: string,
    name: string | undefined,
    credentialsJson: string | undefined,
    healthCheckPath: string | undefined,
  ): Promise<ServerGroupInfo>;
  removeGroup(groupId: string): Promise<void>;

  // group(id) urls
  getGroupUrls(groupId: string): Promise<ServerUrlInfo[]>;
  addGroupUrl(groupId: string, url: string, timeoutMs: number, priority: number): Promise<ServerUrlInfo>;
  updateGroupUrl(
    groupId: string,
    urlId: string,
    url: string | undefined,
    timeoutMs: number | undefined,
    priority: number | undefined,
  ): Promise<ServerUrlInfo>;
  removeGroupUrl(groupId: string, urlId: string): Promise<void>;
  validateGroupUrls(groupId: string): Promise<ServerUrlInfo>;

  // active group
  setActiveGroup(groupId: string): Promise<void>;
  reauthenticateActiveGroup(groupId: string): Promise<void>;
  getActiveGroupId(): Promise<string | null>;

  // content: serials
  listSerials(): Promise<SerialListData>;
  getSerial(serialId: string): Promise<SerialData>;

  // content: chapters
  listChapters(serialId: string): Promise<PluginChapter[]>;
  setChaptersRead(serialId: string, isRead: boolean, chapterIds: string[]): Promise<void>;
  getChapter(serialId: string, chapterId: string): Promise<PluginChapter>;
  setChapterRead(serialId: string, chapterId: string, isRead: boolean): Promise<void>;
  getChapterProgress(serialId: string, chapterId: string): Promise<PluginProgress | null>;
  setChapterProgress(serialId: string, chapterId: string, pageIndex: number): Promise<void>;

  // content: pages
  getPageDimensions(serialId: string, chapterId: string, pageIndex: number): Promise<PluginPageDimension>;
  getPageUrl(serialId: string, chapterId: string, pageIndex: number): Promise<string>;
}

export const ServerBridge: ServerBridgeModuleInterface = NativeModules.ServerBridgeModule;
