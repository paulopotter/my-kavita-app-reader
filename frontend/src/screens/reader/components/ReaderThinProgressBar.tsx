import React from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  fraction: number;
}

export function ReaderThinProgressBar({ fraction }: Props) {
  const clamped = Math.min(1, Math.max(0, fraction));

  return (
    <View style={styles.track}>
      <View testID="reader-thin-progress-fill" style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  fill: { height: 3, backgroundColor: '#E9C46A' },
});
