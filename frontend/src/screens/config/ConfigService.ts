import {
  AuthConfig,
  BffServerConfig,
  ConfigRepository,
  ServerConfig,
  UiPreferences,
} from '../../shared/bridge/config';
import { extractApiKeyToken } from './ConfigTransform';

export interface SaveServerResult {
  ok: boolean;
  error?: string;
}

export interface SaveAuthResult {
  ok: boolean;
  error?: string;
}

export async function loadConfig(): Promise<{
  servers: ServerConfig[];
  auth: AuthConfig | null;
  prefs: UiPreferences;
  bffServers: BffServerConfig[];
}> {
  const [servers, auth, prefs, bffServers] = await Promise.all([
    ConfigRepository.getServerConfigs(),
    ConfigRepository.getAuthConfig(),
    ConfigRepository.getUiPreferences(),
    ConfigRepository.getBffServerConfigs(),
  ]);
  return { servers, auth, prefs, bffServers };
}

export async function saveServer(server: ServerConfig): Promise<SaveServerResult> {
  try {
    await ConfigRepository.upsertServerConfig(server);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteServer(id: string): Promise<void> {
  await ConfigRepository.deleteServerConfig(id);
}

export async function saveApiKey(rawApiKey: string): Promise<SaveAuthResult> {
  const apiKey = extractApiKeyToken(rawApiKey);
  if (!apiKey) {
    return { ok: false, error: 'API key cannot be empty' };
  }
  try {
    await ConfigRepository.upsertAuthConfig({ apiKey });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function savePreferences(prefs: Partial<UiPreferences>): Promise<void> {
  await ConfigRepository.upsertUiPreferences(prefs);
}

export async function addBffServer(
  url: string,
  healthCheckPath: string,
  linkedKavitaServerConfigId?: string,
): Promise<void> {
  await ConfigRepository.insertBffServerConfig({
    url,
    priority: 0,
    healthCheckPath,
    linkedKavitaServerConfigId,
  });
}

export async function removeBffServer(id: string): Promise<void> {
  await ConfigRepository.deleteBffServerConfig(id);
}
