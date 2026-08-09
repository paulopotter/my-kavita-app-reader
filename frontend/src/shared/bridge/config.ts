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
}

export interface DbStatus {
  version: number;
  isOpen: boolean;
}

interface ConfigRepositoryModule {
  getServerConfigs(): Promise<ServerConfig[]>;
  upsertServerConfig(data: Omit<ServerConfig, never>): Promise<void>;
  deleteServerConfig(id: string): Promise<void>;
  getAuthConfig(): Promise<AuthConfig | null>;
  upsertAuthConfig(data: AuthConfig): Promise<void>;
  getUiPreferences(): Promise<UiPreferences>;
  upsertUiPreferences(data: Partial<UiPreferences>): Promise<void>;
}

interface DbValidatorModule {
  getDbStatus(): Promise<DbStatus>;
}

export const ConfigRepository: ConfigRepositoryModule =
  NativeModules.ConfigRepository;

export const DbValidator: DbValidatorModule = NativeModules.DbValidator;
