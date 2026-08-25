import { NativeModules } from 'react-native';
import type { ProviderInfo } from './server';

// Mirrors :external-metadata-server's ExternalMetadataServer (android/external-metadata-server)
// via ExternalMetadataBridgeModule.kt — same generalizer shape as ServerBridge (server.ts), with
// its own active-group state and match/matches namespaces instead of a content tree.

export interface ExternalMetadataGroupInfo {
  id: string;
  name: string;
  providerId: string;
  credentialsJson: string;
  healthCheckPath: string;
  linkedServerGroupId?: string;
}

export interface ExternalMetadataUrlInfo {
  id: string;
  groupId: string;
  url: string;
  timeoutMs: number;
  priority: number;
  linkedServerUrlId?: string;
}

export interface ExternalMetadataGroupFullInfo {
  id: string;
  name: string;
  providerId: string;
  urls: ExternalMetadataUrlInfo[];
}

export interface ExternalMetadataActiveInfo {
  groupId: string;
  groupName: string;
  providerId: string;
  urlId: string;
  url: string;
  timeoutMs: number;
  priority: number;
}

export interface ExternalMetadataMatch {
  seriesId: string;
  slug?: string;
  status: string;
  downloadedChapters?: number;
  totalChapters?: number;
  latestChapterLabel?: string;
  hasErrors: boolean;
}

interface ExternalMetadataBridgeModuleInterface {
  // providers
  listProviders(): Promise<ProviderInfo[]>;

  // groups
  listGroups(): Promise<ExternalMetadataGroupInfo[]>;
  getGroup(groupId: string): Promise<ExternalMetadataGroupInfo | null>;
  addGroup(
    name: string,
    providerId: string,
    credentialsJson: string,
    healthCheckPath: string,
    linkedServerGroupId: string | undefined,
  ): Promise<ExternalMetadataGroupInfo>;
  updateGroup(
    groupId: string,
    name: string | undefined,
    credentialsJson: string | undefined,
    healthCheckPath: string | undefined,
    linkedServerGroupId: string | undefined,
  ): Promise<ExternalMetadataGroupInfo>;
  removeGroup(groupId: string): Promise<void>;

  // group(id) urls
  getGroupUrls(groupId: string): Promise<ExternalMetadataUrlInfo[]>;
  getGroupInfo(groupId: string): Promise<ExternalMetadataGroupFullInfo>;
  addGroupUrl(
    groupId: string,
    url: string,
    timeoutMs: number,
    priority: number,
    linkedServerUrlId: string | undefined,
  ): Promise<ExternalMetadataUrlInfo>;
  updateGroupUrl(
    groupId: string,
    urlId: string,
    url: string | undefined,
    timeoutMs: number | undefined,
    priority: number | undefined,
    linkedServerUrlId: string | undefined,
  ): Promise<ExternalMetadataUrlInfo>;
  removeGroupUrl(groupId: string, urlId: string): Promise<void>;
  validateGroupUrls(groupId: string): Promise<ExternalMetadataUrlInfo>;
  getGroupActive(groupId: string): Promise<ExternalMetadataUrlInfo | null>;

  // active group
  setActiveGroup(groupId: string): Promise<void>;
  reauthenticateActiveGroup(groupId: string): Promise<void>;
  getActiveGroupId(): Promise<string | null>;
  getActive(): Promise<ExternalMetadataUrlInfo | null>;
  getActiveInfo(): Promise<ExternalMetadataActiveInfo | null>;
  getActiveGroupInfo(): Promise<ExternalMetadataGroupFullInfo | null>;

  // match (singular)
  matchSync(seriesId: string, seriesName: string): Promise<ExternalMetadataMatch | null>;
  matchSyncByGroup(groupId: string, seriesId: string, seriesName: string): Promise<ExternalMetadataMatch | null>;
  matchSyncByServerId(
    kavitaServerGroupId: string,
    seriesId: string,
    seriesName: string,
  ): Promise<ExternalMetadataMatch | null>;
  matchSyncByServerUrl(
    kavitaUrl: string,
    seriesId: string,
    seriesName: string,
  ): Promise<ExternalMetadataMatch | null>;

  // matches (batch) — positional: result[i] corresponds to seriesIds[i]/seriesNames[i], null
  // meaning "no match found for this one" — never a shorter array.
  matchesSync(seriesIds: string[], seriesNames: string[]): Promise<(ExternalMetadataMatch | null)[]>;
  matchesSyncByGroup(
    groupId: string,
    seriesIds: string[],
    seriesNames: string[],
  ): Promise<(ExternalMetadataMatch | null)[]>;
  matchesSyncByServerId(
    kavitaServerGroupId: string,
    seriesIds: string[],
    seriesNames: string[],
  ): Promise<(ExternalMetadataMatch | null)[]>;
  matchesSyncByServerUrl(
    kavitaUrl: string,
    seriesIds: string[],
    seriesNames: string[],
  ): Promise<(ExternalMetadataMatch | null)[]>;
}

export const ExternalMetadataBridge: ExternalMetadataBridgeModuleInterface =
  NativeModules.ExternalMetadataBridgeModule;
