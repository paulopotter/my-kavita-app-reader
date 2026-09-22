import type { Strings } from '../../i18n';
import type { ThemeName } from '../../theme';

// Identities whose floor is real black without having a lighter twin. A variant registered as
// `<parent>Oled` takes its parent's name automatically, so renaming an identity renames both rows
// at once; onyx is just as much an OLED palette, and is listed here rather than given a parent it
// does not have.
const OLED_ONLY: string[] = ['onyx'];

// A theme's display name is translatable, so it cannot be the registry key. An identity added
// without a string yet falls back to its key rather than rendering an empty row.
function themeLabels(t: Strings): Record<string, string> {
  return {
    teal: t.themeNameTeal,
    crimson: t.themeNameCrimson,
    onyx: t.themeNameOnyx,
    amber: t.themeNameAmber,
    sepia: t.themeNameSepia,
    steel: t.themeNameSteel,
    wine: t.themeNameWine,
    forest: t.themeNameForest,
  };
}

// The translated label for a ThemeName (or its own registry key as a last resort) — same formula
// wherever a theme identity is shown to the user: Ajustes' theme picker, and the reader's
// progress-colour picker. `<parent>Oled` variants take their parent's label plus the OLED suffix.
export const ThemeLabelsTool = {
  labelOf(name: ThemeName | string, t: Strings): string {
    const parent = name.endsWith('Oled') ? name.slice(0, -4) : null;
    const labels = themeLabels(t);
    const base = labels[parent ?? name] ?? parent ?? name;
    return parent || OLED_ONLY.includes(name) ? `${base} - ${t.themeOledSuffix}` : base;
  },
};
