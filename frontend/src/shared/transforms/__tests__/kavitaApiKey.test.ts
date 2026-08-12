import { extractKavitaApiKey } from '../kavitaApiKey';

describe('extractKavitaApiKey', () => {
  it('extrai a hash de uma URL OPDS completa', () => {
    const url = 'https://mangas-ipa.paulofrauches.com.br/api/opds/abc123DEF456';
    expect(extractKavitaApiKey(url)).toBe('abc123DEF456');
  });

  it('retorna a propria hash quando ja e uma hash pura', () => {
    expect(extractKavitaApiKey('abc123DEF456')).toBe('abc123DEF456');
  });

  it('remove espacos em branco ao redor', () => {
    expect(extractKavitaApiKey('  abc123  ')).toBe('abc123');
  });

  it('extrai a hash de uma URL OPDS com query string', () => {
    const url = 'https://server.com/api/opds/abc123?foo=bar';
    expect(extractKavitaApiKey(url)).toBe('abc123');
  });

  it('extrai a hash de uma URL OPDS com barra final', () => {
    const url = 'https://server.com/api/opds/abc123/';
    expect(extractKavitaApiKey(url)).toBe('abc123');
  });

  it('funciona com URL http (nao apenas https)', () => {
    const url = 'http://192.168.1.100:5000/api/opds/xyz789';
    expect(extractKavitaApiKey(url)).toBe('xyz789');
  });

  it('retorna string vazia quando entrada e vazia', () => {
    expect(extractKavitaApiKey('')).toBe('');
  });

  it('nao afeta uma hash que contem caracteres alfanumericos comuns', () => {
    expect(extractKavitaApiKey('mffpgy3CStF4')).toBe('mffpgy3CStF4');
  });
});
