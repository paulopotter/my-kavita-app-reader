import React from 'react';
import { View } from 'react-native';
import { readerThinProgressBarStyles } from './reader-thin-progress-bar.styles';
import { useStyles } from '../../../../shared/context';
import type { ProgressBarPosition } from '../../../../shared/tools/reader';

interface Props {
  fraction: number;
  // % of the current page in isolation (0..1) — kept in the contract for a future debug overlay;
  // the shipped bar only renders the chapter-wide fill.
  pageFraction?: number;
  // Which edge the bar is anchored to. undefined keeps today's placement (vertical, right,
  // filling top-to-bottom) — see ReaderPrefs.progressBarPosition's own doc for why 'top'/'bottom'
  // switch the bar to horizontal instead of just moving a vertical one to that corner.
  position?: ProgressBarPosition;
}

// Dumb: clamps the fraction it's given and renders the fill along whichever axis `position`
// implies. The clamp is trivial layout math, not domain logic.
export function ReaderThinProgressBar({ fraction, position = 'right' }: Props) {
  const styles = useStyles(readerThinProgressBarStyles);
  const clamped = Math.min(1, Math.max(0, fraction));

  if (position === 'top' || position === 'bottom') {
    return (
      <View style={[styles.trackHorizontal, position === 'top' ? styles.trackTop : styles.trackBottom]}>
        <View
          testID="reader-thin-progress-fill"
          style={[styles.fillHorizontal, { position: 'absolute', left: 0, width: `${clamped * 100}%` }]}
        />
      </View>
    );
  }

  return (
    <View style={[styles.trackVertical, position === 'left' ? styles.trackLeft : styles.trackRight]}>
      <View
        testID="reader-thin-progress-fill"
        style={[styles.fillVertical, { position: 'absolute', top: 0, height: `${clamped * 100}%` }]}
      />
    </View>
  );
}
