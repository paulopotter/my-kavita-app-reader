import React from 'react';
import { View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { useStyles } from '../../../../shared/context';
import { selectStyles } from './select.styles';
import { icon } from '../../../../shared/theme';
import type { HexColor, RgbColor } from '../../../../shared/theme';

export interface SwatchColors {
  /** The identity's accent — what a button or a link wears. */
  accent: RgbColor | HexColor;
  /** What the app's background is under that identity. */
  surface: RgbColor | HexColor;
}

const SIZE = icon.size[5];

// A square split corner to corner: accent above the diagonal, surface below. Two triangles rather
// than two rectangles because a theme is not "half one colour" — the diagonal reads as a sample of
// a palette, the way a paint chip does.
//
// The colours come from the theme REGISTRY, not from useTheme(): a swatch shows an identity that
// is deliberately NOT the active one, so it cannot go through createStyles and has to be inline.
// This is the one place in the app where a colour legitimately bypasses the token rule.
export function SelectSwatch({ accent, surface }: SwatchColors) {
  const styles = useStyles(selectStyles);
  return (
    <View style={styles.swatch}>
      <Svg width={SIZE} height={SIZE} viewBox="0 0 10 10">
        <Polygon points="0,0 10,0 0,10" fill={accent} />
        <Polygon points="10,0 10,10 0,10" fill={surface} />
      </Svg>
    </View>
  );
}
