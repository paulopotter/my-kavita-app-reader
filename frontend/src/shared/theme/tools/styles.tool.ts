import { StyleSheet } from 'react-native';
import type { ThemeColors } from '../colors.types';
import type { TextTokens } from '../typography';
import { ColorTool } from './color.tool';

/** What a style sheet is handed: the tokens it may paint with, plus the tools to shape them. */
export interface StyleContext {
  colors: ThemeColors;
  text: TextTokens;
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
    StyleSheet.create(build({ colors, text, alpha: ColorTool.add.alpha }));
}
