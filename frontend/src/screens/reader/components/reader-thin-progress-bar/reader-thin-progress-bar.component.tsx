import React from 'react';
import { View } from 'react-native';
import { styles } from './reader-thin-progress-bar.styles';

interface Props {
  fraction: number;
  // % of the current page in isolation (0..1) — kept in the contract for a future debug overlay;
  // the shipped bar only renders the chapter-wide fill.
  pageFraction?: number;
}

// Dumb: clamps the fraction it's given and renders the fill. The clamp is trivial layout math,
// not domain logic.
export function ReaderThinProgressBar({ fraction }: Props) {
  const clamped = Math.min(1, Math.max(0, fraction));

  return (
    <View style={styles.track}>
      <View
        testID="reader-thin-progress-fill"
        style={[styles.fill, { position: 'absolute', top: 0, height: `${clamped * 100}%` }]}
      />
    </View>
  );
}
