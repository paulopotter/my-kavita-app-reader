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

export const StringTool = {
  mask,
};
