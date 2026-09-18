// StringTool — generic, domain-agnostic text handling. Knows nothing about API keys/URLs/etc.
// The one place the app does presentational string manipulation.

// Mask the middle of a string, keeping a few chars visible at each end — for showing a secret
// (an API key) without revealing it. A string too short to keep both ends is fully masked.
//   mask('abcd1234efgh', { keepStart: 4, keepEnd: 4 }) -> 'abcd••••efgh'
//   mask('short')                                      -> '••••••••'
function mask(
  value: string,
  { keepStart = 4, keepEnd = 4, maskChar = '•' }: { keepStart?: number; keepEnd?: number; maskChar?: string } = {},
): string {
  if (value.length <= keepStart + keepEnd) {
    return maskChar.repeat(8);
  }
  const middle = maskChar.repeat(value.length - keepStart - keepEnd);
  return `${value.slice(0, keepStart)}${middle}${value.slice(-keepEnd)}`;
}

// Fold a string to a comparable form: decompose to NFD, drop the combining marks that
// decomposition exposes (so "ç" → "c", "ã" → "a"), lowercase, and collapse runs of whitespace.
// Deliberately knows nothing about WHY a caller wants this — it's the same fold whether you're
// comparing, searching or sorting; the decision of what to do with the result stays with them.
function toNFD(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export const StringTool = {
  mask,
  normalize: {
    NFD: toNFD,
  },
};
