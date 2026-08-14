import React from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  fraction: number;
}

export function ReaderThinProgressBar({ fraction }: Props) {
  const clamped = Math.min(1, Math.max(0, fraction));

  return (
    <View style={styles.track}>
      <View testID="reader-thin-progress-fill" style={[styles.fill, { height: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    position: 'absolute',
    right: 4,
    top: '10%',
    bottom: '10%',
    width: 3,
    borderRadius: 1.5,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.6)',
    backgroundColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  fill: { width: 3, backgroundColor: '#FFC107' },
});
