import React from 'react';
import { Text } from 'react-native';
import { colors } from '../../theme';
import { styles } from './follow-star.styles';

// A filled/hollow star for the "following" state. Dumb — the parent owns whether it's active and
// what happens on press; this only renders the glyph. `color`/`activeColor` default to the theme
// tokens but a caller (e.g. a card on a lighter surface) can override.
export interface FollowStarProps {
  active: boolean;
  size?: number;
  color?: string;
  activeColor?: string;
}

export function FollowStar({
  active,
  size = 22,
  color = colors.muted,
  activeColor = colors.starActive,
}: FollowStarProps) {
  return (
    <Text style={[styles.icon, { fontSize: size, color: active ? activeColor : color }]}>
      {active ? '★' : '☆'}
    </Text>
  );
}
