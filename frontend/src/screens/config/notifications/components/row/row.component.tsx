import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './row.styles';

// A single configured URL of a notification group. Dumb: a primary line, an optional trailing
// label (priority), and a "⋯" that calls props.onMenu. The screen owns the context menu.
export interface RowProps {
  primary: string;
  trailing?: string;
  onMenu: () => void;
}

export function Row({ primary, trailing, onMenu }: RowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.body}>
        <Text style={styles.primary} numberOfLines={1}>
          {primary}
        </Text>
      </View>
      {trailing != null && <Text style={styles.trailing}>{trailing}</Text>}
      <TouchableOpacity onPress={onMenu} hitSlop={8}>
        <Text style={styles.dots}>⋯</Text>
      </TouchableOpacity>
    </View>
  );
}
