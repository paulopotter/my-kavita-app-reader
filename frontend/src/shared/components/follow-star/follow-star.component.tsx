import React from 'react';
import { Star } from 'lucide-react-native';
import { colors } from '../../theme';

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

export function FollowStar({
  active,
  size = 22,
  color = colors.icon.tertiary,
  activeColor = colors.icon.following,
}: FollowStarProps) {
  const tint = active ? activeColor : color;
  return <Star size={size} color={tint} fill={active ? tint : 'none'} />;
}
