import { UrlTool } from './url.tool';

describe('UrlTool.isValid', () => {
  it('accepts absolute http and https URLs with a host', () => {
    expect(UrlTool.isValid('http://192.168.0.10:5000')).toBe(true);
    expect(UrlTool.isValid('https://server.example.com')).toBe(true);
    expect(UrlTool.isValid('https://server.example.com/path')).toBe(true);
  });

  it('trims surrounding whitespace before checking', () => {
    expect(UrlTool.isValid('  http://host  ')).toBe(true);
  });

  it('rejects bare hosts, other schemes and empty input', () => {
    expect(UrlTool.isValid('192.168.0.10:5000')).toBe(false);
    expect(UrlTool.isValid('ftp://host')).toBe(false);
    expect(UrlTool.isValid('http://')).toBe(false);
    expect(UrlTool.isValid('')).toBe(false);
    expect(UrlTool.isValid('   ')).toBe(false);
  });
});

describe('UrlTool.stripTrailingSlash', () => {
  it('removes a single trailing slash and trims', () => {
    expect(UrlTool.stripTrailingSlash('http://host/')).toBe('http://host');
    expect(UrlTool.stripTrailingSlash('  http://host/  ')).toBe('http://host');
  });

  it('leaves a URL without a trailing slash untouched', () => {
    expect(UrlTool.stripTrailingSlash('http://host/api')).toBe('http://host/api');
  });
});

describe('UrlTool.sameLocation', () => {
  it('treats addresses that differ only by a trailing slash as equal', () => {
    expect(UrlTool.sameLocation('http://host', 'http://host/')).toBe(true);
    expect(UrlTool.sameLocation('  http://host/ ', 'http://host')).toBe(true);
  });

  it('is false for genuinely different addresses', () => {
    expect(UrlTool.sameLocation('http://host:1', 'http://host:2')).toBe(false);
    expect(UrlTool.sameLocation('http://a', 'http://b')).toBe(false);
  });
});
