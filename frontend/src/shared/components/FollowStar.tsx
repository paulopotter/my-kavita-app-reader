import React from 'react';
import { StyleSheet, Text } from 'react-native';

const DEFAULT_COLOR = '#A0AEC0';
const DEFAULT_ACTIVE_COLOR = '#F6AD55';

interface Props {
  active: boolean;
  size?: number;
  color?: string;
  activeColor?: string;
}

export function FollowStar({ active, size = 22, color = DEFAULT_COLOR, activeColor = DEFAULT_ACTIVE_COLOR }: Props) {
  return (
    <Text style={[styles.icon, { fontSize: size, color: active ? activeColor : color }]}>
      {active ? '★' : '☆'}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: { fontWeight: '400' },
});
