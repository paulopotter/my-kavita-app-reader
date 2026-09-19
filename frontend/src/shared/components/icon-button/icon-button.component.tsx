import React from 'react';
import { TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useStyles } from '../../context';
import { spacing } from '../../theme';
import { iconButtonStyles } from './icon-button.styles';
import { GLYPH_INSET, type GlyphName } from './icon-button.glyphs';

// Keeps the tappable area comfortable even when the glyph itself is small.
const HIT_SLOP = { top: spacing[5], bottom: spacing[5], left: spacing[5], right: spacing[5] };

export interface IconButtonProps {
  /** The Lucide icon to draw. */
  icon: LucideIcon;
  /** Which glyph it is, so its own empty margin can be discounted — see icon-button.glyphs. */
  glyph: GlyphName;
  size: number;
  color: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  /**
   * Pull the button left by the glyph's empty margin, so the STROKE — not the box around it —
   * lines up with whatever the container insets by. For an icon in a corner with content below
   * it; without this the icon reads as pushed further in than everything else.
   */
  alignStroke?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A tappable icon that can line its stroke up with the content around it.
 *
 * A Lucide glyph is drawn inside a 24-unit box and none of them fill it: a chevron leaves 9 units
 * empty on each side, an arrow 5, a circle 2. So placing the BOX at the gutter leaves the visible
 * stroke short of it by that much — which is why `alignStroke` exists, and why the amount depends
 * on which glyph is being drawn rather than being one number for every icon.
 */
export function IconButton({
  icon: Icon,
  glyph,
  size,
  color,
  onPress,
  accessibilityLabel,
  alignStroke,
  style,
}: IconButtonProps) {
  const styles = useStyles(iconButtonStyles);
  const inset = alignStroke ? Math.round(size * GLYPH_INSET[glyph]) : 0;
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={HIT_SLOP}
      style={[styles.button, alignStroke && { marginLeft: -inset, marginRight: -inset }, style]}>
      <Icon size={size} color={color} />
    </TouchableOpacity>
  );
}
