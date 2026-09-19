import { StyleSheet } from 'react-native';
import type { ThemeColors } from '../colors.types';
import { line, type TextTokens, type LineTokens } from '../typography';
import { spacing, radius, border, gutter, icon, type Spacing, type Radius, type Border, type Gutter, type Icon } from '../sizes';
import { ColorTool } from './color.tool';

/** What a style sheet is handed: the tokens it may paint with, plus the tools to shape them. */
export interface StyleContext {
  colors: ThemeColors;
  text: TextTokens;
  /** Line heights — their own scale, paired with a size at the call site. */
  line: LineTokens;
  spacing: Spacing;
  radius: Radius;
  border: Border;
  /** The inset every screen opens with, so nothing sits flush against the edge. */
  gutter: Gutter;
  /** Glyph sizes — `icon.size[4]` is the app's most common inline action. */
  icon: Icon;
  /** The same colour at a given opacity — the axis tokens deliberately do not carry. */
  alpha: typeof ColorTool.add.alpha;
}

/**
 * Declare a screen's styles against the theme.
 *
 * ```ts
 * export const makeStyles = createStyles(({ colors, text, alpha }) => ({
 *   root: { backgroundColor: colors.surface.primary },
 * }));
 * ```
 *
 * The tokens are inferred, so a style sheet imports nothing — and a token group added later
 * (spacing, radius) reaches every sheet without touching one of them.
 */
export function createStyles<T extends StyleSheet.NamedStyles<T>>(
  build: (context: StyleContext) => T,
) {
  return ({ colors, text }: { colors: ThemeColors; text: TextTokens }) =>
    StyleSheet.create(build({ colors, text, line, spacing, radius, border, gutter, icon, alpha: ColorTool.add.alpha }));
}
