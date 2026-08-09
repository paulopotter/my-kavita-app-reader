import { AuthConfig, ServerConfig, UiPreferences } from '../../shared/bridge/config';

export interface ServerConfigForm {
  id: string;
  url: string;
  timeoutMs: string;
  priority: string;
  healthCheckPath: string;
}

export interface ConfigFormState {
  servers: ServerConfig[];
  auth: AuthConfig | null;
  prefs: UiPreferences | null;
}

export function serverToForm(server: ServerConfig): ServerConfigForm {
  return {
    id: server.id,
    url: server.url,
    timeoutMs: String(server.timeoutMs),
    priority: String(server.priority),
    healthCheckPath: server.healthCheckPath,
  };
}

export function formToServer(form: ServerConfigForm): ServerConfig {
  return {
    id: form.id.trim(),
    url: form.url.trim(),
    timeoutMs: parseInt(form.timeoutMs, 10) || 5000,
    priority: parseInt(form.priority, 10) || 0,
    healthCheckPath: form.healthCheckPath.trim() || '/api/health',
  };
}

export function extractApiKeyToken(rawApiKey: string): string {
  return rawApiKey.trim();
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return '••••••••';
  }
  return `${apiKey.slice(0, 4)}${'•'.repeat(apiKey.length - 8)}${apiKey.slice(-4)}`;
}
