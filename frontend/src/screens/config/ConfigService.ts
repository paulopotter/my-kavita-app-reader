import { ConfigRepository, ServerConfig, AuthConfig, UiPreferences } from '../../shared/bridge/config';
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
}> {
  const [servers, auth, prefs] = await Promise.all([
    ConfigRepository.getServerConfigs(),
    ConfigRepository.getAuthConfig(),
    ConfigRepository.getUiPreferences(),
  ]);
  return { servers, auth, prefs };
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
