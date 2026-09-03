import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './row.styles';

// A single configured item — a Kavita URL, the API key, or a BFF server. Dumb: an activity dot,
// a primary line, an optional secondary line, and a "⋯" that calls props.onMenu. The screen owns
// the context menu and every action.
export interface RowProps {
  active: boolean;
  primary: string;
  secondary?: string;
  // When secondary is meant to read as "nothing linked" — renders italic/dim.
  secondaryEmpty?: boolean;
  onMenu: () => void;
}

export function Row({ active, primary, secondary, secondaryEmpty, onMenu }: RowProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, active ? styles.dotActive : styles.dotInactive]} />
      <View style={styles.body}>
        <Text style={styles.primary} numberOfLines={1}>
          {primary}
        </Text>
        {secondary != null && (
          <Text style={secondaryEmpty ? styles.secondaryNone : styles.secondary} numberOfLines={1}>
            {secondary}
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={onMenu} hitSlop={8}>
        <Text style={styles.dots}>⋯</Text>
      </TouchableOpacity>
    </View>
  );
}
