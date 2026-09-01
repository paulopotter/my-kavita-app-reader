import React from 'react';
import { Text, View } from 'react-native';
import { styles } from './reader-thin-progress-bar.styles';

interface Props {
  fraction: number;
  // % of the current page in isolation (0..1) — debug mode only, shown next to the chapter's "Y%"
  // to tell "how much of this image scrolled" from "how much of the chapter was read".
  pageFraction?: number;
}

// Debug mode (numeric label, 10% ticks, high-contrast colors) for visually validating the fill
// tracks scrollFraction/chapterFraction 1:1. Off by default — flip here to debug again.
const DEBUG_MODE = false;

// Dumb: clamps the fractions it's given and renders the fill. The clamp is trivial layout math,
// not domain logic.
export function ReaderThinProgressBar({ fraction, pageFraction = 0 }: Props) {
  const clamped = Math.min(1, Math.max(0, fraction));
  const clampedPage = Math.min(1, Math.max(0, pageFraction));
  const percentLabel = `${(clampedPage * 100).toFixed(1)}% <${(clamped * 100).toFixed(1)}%>`;

  return (
    <View style={DEBUG_MODE ? styles.trackDebug : styles.track}>
      <View
        testID="reader-thin-progress-fill"
        style={[
          DEBUG_MODE ? styles.fillDebug : styles.fill,
          { position: 'absolute', top: 0, height: `${clamped * 100}%` },
        ]}
      />
      {DEBUG_MODE && (
        <>
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(percent => (
            <View key={percent} style={[styles.tickMark, { top: `${percent}%` }]} />
          ))}
          <View style={[styles.labelWrapper, { top: `${clamped * 100}%` }]}>
            <Text testID="reader-thin-progress-label" style={styles.label}>
              {percentLabel}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}
