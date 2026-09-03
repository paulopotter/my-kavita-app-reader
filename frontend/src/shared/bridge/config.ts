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
  immersiveModeDuringReading: boolean;
  chapterSortMode: 'ASCENDING' | 'DESCENDING' | 'NONE';
  chapterSortFixedThreshold?: number;
  chapterSortProgressPercent: number;
  libraryViewMode: 'GRID' | 'LIST';
  librarySortMode: 'RECENTLY_UPDATED' | 'ALPHABETICAL';
  followingViewMode: 'GRID' | 'LIST';
  followingSortMode: 'RECENTLY_UPDATED' | 'ALPHABETICAL';
  // NOTE: the UI language is NOT here — it lives in the OS per-app locale. Read it with
  // getAppLocale(), change it with setAppLocale(). App and system stay in sync that way.
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
  // The UI language, sourced from and written to the OS per-app locale (Settings > App
  // languages). getAppLocale returns one of the app's supported tags ("pt-BR" / "en").
  getAppLocale(): Promise<string>;
  setAppLocale(languageTag: string): Promise<void>;
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
  isAuthenticated(): Promise<boolean>;
  testBffConnection(): Promise<{ activeUrl: string }>;
}

export const ConfigRepository: ConfigRepositoryModule =
  NativeModules.ConfigRepository;

export const DbValidator: DbValidatorModule = NativeModules.DbValidator;

export const SetupBridge: SetupModuleInterface = NativeModules.SetupModule;
