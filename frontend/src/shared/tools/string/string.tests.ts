import { StringTool } from './string.tool';

describe('StringTool.mask', () => {
  it('keeps the default four chars at each end and masks the middle', () => {
    expect(StringTool.mask('abcd1234efgh')).toBe('abcd••••efgh');
  });

  it('grows the mask to match the hidden length', () => {
    const out = StringTool.mask('abcdXXXXXXXXefgh'); // 16 chars, 8 hidden
    expect(out).toBe('abcd••••••••efgh');
    expect(out).toHaveLength(16);
  });

  it('fully masks (to 8 chars) a string too short to keep both ends', () => {
    expect(StringTool.mask('short')).toBe('••••••••');
    expect(StringTool.mask('exactly8')).toBe('••••••••'); // length == keepStart + keepEnd
  });

  it('honours custom keepStart / keepEnd / maskChar', () => {
    expect(StringTool.mask('abcdefghij', { keepStart: 2, keepEnd: 2, maskChar: '*' })).toBe('ab******ij');
  });
});

describe('StringTool.normalize.NFD', () => {
  it('strips accents and diacritics', () => {
    expect(StringTool.normalize.NFD('Ação')).toBe('acao');
    expect(StringTool.normalize.NFD('coração')).toBe('coracao');
    expect(StringTool.normalize.NFD('Pokémon')).toBe('pokemon');
    expect(StringTool.normalize.NFD('über')).toBe('uber');
  });

  it('lowercases', () => {
    expect(StringTool.normalize.NFD('ONE PIECE')).toBe('one piece');
  });

  it('collapses whitespace runs and trims', () => {
    expect(StringTool.normalize.NFD('  Attack   on   Titan  ')).toBe('attack on titan');
    expect(StringTool.normalize.NFD('a\tb\nc')).toBe('a b c');
  });

  it('leaves an already-folded string untouched (idempotent)', () => {
    expect(StringTool.normalize.NFD(StringTool.normalize.NFD('Ação'))).toBe('acao');
  });

  it('handles an empty string', () => {
    expect(StringTool.normalize.NFD('')).toBe('');
    expect(StringTool.normalize.NFD('   ')).toBe('');
  });
});
