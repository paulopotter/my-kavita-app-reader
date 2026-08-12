const OPDS_URL_PATTERN = /\/api\/opds\/([^/?#]+)/i;

export function extractKavitaApiKey(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(OPDS_URL_PATTERN);
  return match ? match[1] : trimmed;
}
