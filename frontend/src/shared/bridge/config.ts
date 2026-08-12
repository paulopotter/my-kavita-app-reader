import { NativeModules } from 'react-native';

export interface ServerConfig {
  id: string;
  url: string;
  timeoutMs: number;
  priority: number;
  healthCheckPath: string;
}

export interface AuthConfig {
  apiKey: string;
  jwt?: string;
}

export interface UiPreferences {
  keepScreenOnDuringReading: boolean;
  chapterSortMode: 'ASCENDING' | 'DESCENDING' | 'NONE';
  chapterSortFixedThreshold?: number;
  chapterSortProgressPercent: number;
  language: string;
  libraryViewMode: 'GRID' | 'LIST';
  librarySortMode: 'RECENTLY_UPDATED' | 'ALPHABETICAL';
  followingViewMode: 'GRID' | 'LIST';
  followingSortMode: 'RECENTLY_UPDATED' | 'ALPHABETICAL';
}

export interface DbStatus {
  version: number;
  isOpen: boolean;
}

export interface BffServerConfig {
  id: string;
  url: string;
  priority: number;
  healthCheckPath: string;
  linkedKavitaServerConfigId?: string;
}

interface ConfigRepositoryModule {
  getServerConfigs(): Promise<ServerConfig[]>;
  upsertServerConfig(data: ServerConfig): Promise<void>;
  deleteServerConfig(id: string): Promise<void>;
  getAuthConfig(): Promise<AuthConfig | null>;
  upsertAuthConfig(data: AuthConfig): Promise<void>;
  getUiPreferences(): Promise<UiPreferences>;
  upsertUiPreferences(data: Partial<UiPreferences>): Promise<void>;
  getBffServerConfigs(): Promise<BffServerConfig[]>;
  insertBffServerConfig(data: Omit<BffServerConfig, 'id'>): Promise<void>;
  deleteBffServerConfig(id: string): Promise<void>;
}

interface DbValidatorModule {
  getDbStatus(): Promise<DbStatus>;
}

interface SetupModuleInterface {
  getLastKnownUrls(): Promise<{ kavitaUrl?: string; bffUrl?: string }>;
  testKavitaConnection(): Promise<{ activeUrl: string }>;
  forceReselectUrl(): Promise<{ activeUrl: string }>;
  authenticate(apiKey: string): Promise<void>;
  testBffConnection(): Promise<{ activeUrl: string }>;
}

export const ConfigRepository: ConfigRepositoryModule =
  NativeModules.ConfigRepository;

export const DbValidator: DbValidatorModule = NativeModules.DbValidator;

export const SetupBridge: SetupModuleInterface = NativeModules.SetupModule;
