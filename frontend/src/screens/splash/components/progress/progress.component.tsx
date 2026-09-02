import React from 'react';
import { Text, View } from 'react-native';
import { styles } from './progress.styles';

export interface ProgressProps {
  // 0..1. Clamped here so a caller can pass raw values without guarding.
  progress: number;
  // Optional line under the bar — reserved for "what's loading now" / playful messages later.
  // Nothing renders when it's absent, so the bar sits alone exactly like today.
  label?: string;
}

// Dumb component: draws the determinate progress bar and, when given one, a caption under it.
// All wording and the progress number come from the hook/screen.
export const Progress = React.memo(function Progress({ progress, label }: ProgressProps) {
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  return (
    <View style={styles.root}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      {label ? (
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );
});
