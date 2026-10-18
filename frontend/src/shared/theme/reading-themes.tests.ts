import {
  DEFAULT_READING_THEME,
  READING_THEME_NAMES,
  isReadingThemeName,
  readingPalettes,
  type FixedReadingThemeName,
} from './reading-themes';

function luminance(hex: string): number {
  const channel = (offset: number): number => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const fixed = Object.keys(readingPalettes) as FixedReadingThemeName[];

describe('reading palettes', () => {
  it('has a palette for every theme name but "app", which is the caller\'s to paint', () => {
    expect([...fixed].sort()).toEqual(READING_THEME_NAMES.filter(name => name !== 'app').sort());
    expect(DEFAULT_READING_THEME).toBe('app');
  });

  it.each(fixed)('%s: every colour is an opaque 6-digit hex', name => {
    for (const color of Object.values(readingPalettes[name])) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it.each(fixed)('%s: body text clears 7:1 (WCAG AAA) on the page', name => {
    const { background, text } = readingPalettes[name];
    expect(contrast(text, background)).toBeGreaterThanOrEqual(7);
  });

  it.each(fixed)('%s: links clear 7:1 (WCAG AAA) on the page', name => {
    const { background, link } = readingPalettes[name];
    expect(contrast(link, background)).toBeGreaterThanOrEqual(7);
  });

  it.each(fixed)('%s: a link is told apart from body text', name => {
    const { text, link } = readingPalettes[name];
    expect(link.toLowerCase()).not.toBe(text.toLowerCase());
  });

  it('keeps pure white off the dark pages except in the high-contrast one', () => {
    for (const name of ['dark', 'night', 'black'] as const) {
      expect(readingPalettes[name].text.toUpperCase()).not.toBe('#FFFFFF');
    }
    expect(readingPalettes.contrast.text.toUpperCase()).toBe('#FFFFFF');
  });
});

describe('isReadingThemeName', () => {
  it('accepts every name and rejects anything else', () => {
    for (const name of READING_THEME_NAMES) {expect(isReadingThemeName(name)).toBe(true);}
    expect(isReadingThemeName('solarized')).toBe(false);
    expect(isReadingThemeName(3)).toBe(false);
    expect(isReadingThemeName(undefined)).toBe(false);
  });
});
