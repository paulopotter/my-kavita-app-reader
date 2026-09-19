import React from 'react';
import { Star } from 'lucide-react-native';
import { useTheme } from '../../context';

// A filled/hollow star for the "following" state. Dumb — the parent owns whether it's active and
// what happens on press; this only renders the glyph. `color`/`activeColor` default to the theme
// tokens but a caller (e.g. a card on a lighter surface) can override.
//
// Filled vs hollow is `fill`, not a second icon: lucide ships one `Star` whose default is
// `fill: "none"`, so passing the same colour to `fill` and `color` is what makes it solid.
export interface FollowStarProps {
  active: boolean;
  size?: number;
  color?: string;
  activeColor?: string;
}

export function FollowStar({ active, size = 22, color, activeColor }: FollowStarProps) {
  // The defaults come from the live palette, so they cannot be parameter defaults (those are
  // evaluated before any hook runs). A caller's override still wins.
  const { colors } = useTheme();
  const tint = active ? activeColor ?? colors.icon.following : color ?? colors.icon.tertiary;
  return <Star size={size} color={tint} fill={active ? tint : 'none'} />;
}
