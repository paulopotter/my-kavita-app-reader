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
