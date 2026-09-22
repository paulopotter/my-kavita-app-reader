import { ThemeLabelsTool } from './theme-labels.tool';
import { getStrings } from '../../i18n/strings';

const t = getStrings('pt-BR');

describe('ThemeLabelsTool.labelOf', () => {
  it('returns the translated label for a plain theme', () => {
    expect(ThemeLabelsTool.labelOf('crimson', t)).toBe(t.themeNameCrimson);
  });

  it('falls back to the raw key when a theme has no translated label', () => {
    expect(ThemeLabelsTool.labelOf('not-a-real-theme', t)).toBe('not-a-real-theme');
  });

  it('appends the OLED suffix for a <parent>Oled variant, using the parent\'s label', () => {
    expect(ThemeLabelsTool.labelOf('crimsonOled', t)).toBe(`${t.themeNameCrimson} - ${t.themeOledSuffix}`);
  });

  it('appends the OLED suffix for onyx even though it has no separate parent entry', () => {
    expect(ThemeLabelsTool.labelOf('onyx', t)).toBe(`${t.themeNameOnyx} - ${t.themeOledSuffix}`);
  });

  it('does not append the OLED suffix for a theme that is neither a variant nor OLED-only', () => {
    expect(ThemeLabelsTool.labelOf('teal', t)).toBe(t.themeNameTeal);
  });
});
