import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { Strings } from '../../../../shared/i18n/strings';
import type { ChapterSortMode } from '../../serie.types';
import { styles } from './chapter-sort.styles';

const MODES: ChapterSortMode[] = ['ASCENDING', 'DESCENDING', 'AUTO_FIXED', 'AUTO_PROGRESS'];

// The label a sort mode shows on a button. Presentational only — exported because SerieScreen's
// own sort-toggle button (outside the modal) shows the current mode with the exact same wording;
// one formula, not two.
export function sortModeLabel(
  mode: ChapterSortMode,
  fixedThreshold: number | undefined,
  progressPercent: number,
  t: Strings,
): string {
  switch (mode) {
    case 'ASCENDING':
      return t.seriesDetailSortAscending;
    case 'DESCENDING':
      return t.seriesDetailSortDescending;
    case 'AUTO_FIXED':
      return t.seriesDetailSortAutoFixed.replace('{0}', String(fixedThreshold ?? 0));
    case 'AUTO_PROGRESS':
      return t.seriesDetailSortAutoProgress.replace('{0}', String(progressPercent));
  }
}

// Turns the two free-text inputs into a valid { fixedThreshold, progressPercent }: threshold
// NaN/negative → undefined; progress out of range → clamped to 0–100; empty → the fallback.
function parseInputs(
  thresholdText: string,
  progressText: string,
  fallbackProgressPercent: number,
): { fixedThreshold: number | undefined; progressPercent: number } {
  const parsedThreshold = parseFloat(thresholdText);
  const parsedProgress = parseInt(progressText, 10);
  const fixedThreshold = isNaN(parsedThreshold) || parsedThreshold < 0 ? undefined : parsedThreshold;
  const progressPercent = isNaN(parsedProgress)
    ? fallbackProgressPercent
    : Math.min(100, Math.max(0, parsedProgress));
  return { fixedThreshold, progressPercent };
}

// The chapter-sort fields: 4 mode buttons + the two free-text inputs the AUTO_* modes need.
// Dumb — it holds only its own transient text state and emits the parsed value via onChange; the
// screen that hosts it (SerieScreen's sort modal, and Config's "manga page" sub-screen) decides
// whether to persist that globally or per-series (ChaptersTool.sort scope). Same component in
// both places — the only difference is the scope of the save, which lives in each screen's hook.
export interface ChapterSortFieldsProps {
  mode: ChapterSortMode;
  fixedThreshold?: number;
  progressPercent: number;
  t: Strings;
  onChange: (mode: ChapterSortMode, fixedThreshold: number | undefined, progressPercent: number) => void;
}

export function ChapterSortFields({ mode, fixedThreshold, progressPercent, t, onChange }: ChapterSortFieldsProps) {
  const [selectedMode, setSelectedMode] = useState<ChapterSortMode>(mode);
  const [thresholdText, setThresholdText] = useState(String(fixedThreshold ?? ''));
  const [progressText, setProgressText] = useState(String(progressPercent));

  function emit(nextMode: ChapterSortMode, nextThresholdText: string, nextProgressText: string) {
    const parsed = parseInputs(nextThresholdText, nextProgressText, progressPercent);
    onChange(nextMode, parsed.fixedThreshold, parsed.progressPercent);
  }

  function handleSelectMode(m: ChapterSortMode) {
    setSelectedMode(m);
    emit(m, thresholdText, progressText);
  }

  function handleThresholdChange(text: string) {
    const sanitized = text.replace(/[^0-9.]/g, '');
    setThresholdText(sanitized);
    emit(selectedMode, sanitized, progressText);
  }

  function handleProgressChange(text: string) {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    const clamped = digitsOnly === '' ? '' : String(Math.min(100, parseInt(digitsOnly, 10)));
    setProgressText(clamped);
    emit(selectedMode, thresholdText, clamped);
  }

  return (
    <View style={styles.root}>
      <View style={styles.modeList}>
        {MODES.map(m => (
          <View key={m}>
            <TouchableOpacity
              style={[styles.modeOption, selectedMode === m && styles.modeOptionSelected]}
              onPress={() => handleSelectMode(m)}>
              <Text style={[styles.modeOptionText, selectedMode === m && styles.modeOptionTextSelected]}>
                {sortModeLabel(m, fixedThreshold, progressPercent, t)}
              </Text>
            </TouchableOpacity>

            {selectedMode === m && m === 'AUTO_FIXED' && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t.seriesDetailSortConfigFixedThresholdLabel}</Text>
                <TextInput
                  style={styles.input}
                  value={thresholdText}
                  onChangeText={handleThresholdChange}
                  keyboardType="numeric"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
                <Text style={styles.fieldHint}>{t.seriesDetailSortConfigFixedThresholdHint}</Text>
              </View>
            )}

            {selectedMode === m && m === 'AUTO_PROGRESS' && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t.seriesDetailSortConfigProgressPercentLabel}</Text>
                <TextInput
                  style={styles.input}
                  value={progressText}
                  onChangeText={handleProgressChange}
                  keyboardType="numeric"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
                <Text style={styles.fieldHint}>{t.seriesDetailSortConfigProgressPercentHint}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
