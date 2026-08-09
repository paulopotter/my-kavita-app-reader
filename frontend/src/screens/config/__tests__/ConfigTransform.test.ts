import {
  serverToForm,
  formToServer,
  extractApiKeyToken,
  maskApiKey,
} from '../ConfigTransform';
import { ServerConfig } from '../../../shared/bridge/config';

const mockServer: ServerConfig = {
  id: 's1',
  url: 'http://kavita.local',
  timeoutMs: 5000,
  priority: 1,
  healthCheckPath: '/api/health',
};

describe('serverToForm', () => {
  it('converts ServerConfig to form strings', () => {
    const form = serverToForm(mockServer);
    expect(form.id).toBe('s1');
    expect(form.url).toBe('http://kavita.local');
    expect(form.timeoutMs).toBe('5000');
    expect(form.priority).toBe('1');
    expect(form.healthCheckPath).toBe('/api/health');
  });
});

describe('formToServer', () => {
  it('converts form strings back to ServerConfig', () => {
    const form = serverToForm(mockServer);
    const back = formToServer(form);
    expect(back).toEqual(mockServer);
  });

  it('falls back to defaults for invalid numbers', () => {
    const server = formToServer({ id: 'x', url: 'http://x', timeoutMs: 'abc', priority: '', healthCheckPath: '' });
    expect(server.timeoutMs).toBe(5000);
    expect(server.priority).toBe(0);
    expect(server.healthCheckPath).toBe('/api/health');
  });

  it('trims whitespace from url and id', () => {
    const server = formToServer({ id: '  s1  ', url: '  http://x  ', timeoutMs: '3000', priority: '0', healthCheckPath: '/health' });
    expect(server.id).toBe('s1');
    expect(server.url).toBe('http://x');
  });
});

describe('extractApiKeyToken', () => {
  it('trims whitespace', () => {
    expect(extractApiKeyToken('  my-key  ')).toBe('my-key');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(extractApiKeyToken('   ')).toBe('');
  });

  it('returns the key unchanged when no whitespace', () => {
    expect(extractApiKeyToken('abc-123')).toBe('abc-123');
  });
});

describe('maskApiKey', () => {
  it('masks keys longer than 8 chars', () => {
    const masked = maskApiKey('abcd1234efgh');
    expect(masked).toMatch(/^abcd.*efgh$/);
    expect(masked).toContain('•');
  });

  it('returns all dots for keys 8 chars or shorter', () => {
    expect(maskApiKey('short')).toBe('••••••••');
    expect(maskApiKey('12345678')).toBe('••••••••');
  });
});
