import { getStrings } from '../../i18n/strings';
import { READING_THEME_NAMES, readingPalettes, themes } from '../../theme';
import { BookThemeTool } from './book-theme.tool';

describe('BookThemeTool.colors', () => {
  it('hands a fixed theme its own palette', () => {
    expect(BookThemeTool.colors({ theme: 'sepia', appColors: themes.teal })).toEqual(readingPalettes.sepia);
    expect(BookThemeTool.colors({ theme: 'black', appColors: themes.forest })).toEqual(readingPalettes.black);
  });

  it('paints "app" with the colours of the active app theme, as hex', () => {
    const colors = BookThemeTool.colors({ theme: 'app', appColors: themes.forest });
    for (const value of Object.values(colors)) {expect(value).toMatch(/^#[0-9a-f]{6}$/i);}
    // Not one of the fixed palettes: it follows the app.
    expect(colors).not.toEqual(BookThemeTool.colors({ theme: 'app', appColors: themes.onyx }));
  });
});

describe('BookThemeTool.labelOf', () => {
  it.each(['pt-BR', 'en'] as const)('names every theme in %s, each differently', language => {
    const t = getStrings(language);
    const labels = READING_THEME_NAMES.map(name => BookThemeTool.labelOf(name, t));
    expect(labels.every(label => label.length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(READING_THEME_NAMES.length);
  });
});
