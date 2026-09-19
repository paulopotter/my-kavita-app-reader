import { useMemo } from 'react';
import { useTheme, type ThemeState } from './theme.context';

/** What a `*.styles.ts` receives: the tokens it may paint with. */
export type StyleTokens = Pick<ThemeState, 'colors' | 'text'>;

/**
 * A screen's styles, rebuilt only when the tokens change.
 *
 * ```ts
 * const styles = useStyles(makeStyles);
 * ```
 *
 * The memo lives here so no call site can forget it — without one, every render would rebuild the
 * whole StyleSheet.
 */
export function useStyles<T>(make: (tokens: StyleTokens) => T): T {
  const { colors, text } = useTheme();
  return useMemo(() => make({ colors, text }), [make, colors, text]);
}
