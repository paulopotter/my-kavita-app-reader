import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ChapterSortMode } from '../bridge/series';
import { Strings } from '../i18n/strings';
import { parseSortConfigInput, sortModeLabel } from '../transforms/sortConfig';

const MODES: ChapterSortMode[] = ['ASCENDING', 'DESCENDING', 'AUTO_FIXED', 'AUTO_PROGRESS'];

export interface ChapterSortConfigFieldsHandle {
  getValue: () => { mode: ChapterSortMode; fixedThreshold: number | undefined; progressPercent: number };
}

interface Props {
  mode: ChapterSortMode;
  fixedThreshold?: number;
  progressPercent: number;
  t: Strings;
  onChange: (mode: ChapterSortMode, fixedThreshold: number | undefined, progressPercent: number) => void;
}

export function ChapterSortConfigFields({ mode, fixedThreshold, progressPercent, t, onChange }: Props) {
  const [selectedMode, setSelectedMode] = useState<ChapterSortMode>(mode);
  const [thresholdText, setThresholdText] = useState(String(fixedThreshold ?? ''));
  const [progressText, setProgressText] = useState(String(progressPercent));

  function emit(nextMode: ChapterSortMode, nextThresholdText: string, nextProgressText: string) {
    const parsed = parseSortConfigInput(nextThresholdText, nextProgressText, progressPercent);
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

const styles = StyleSheet.create({
  root: { gap: 12 },
  modeList: { gap: 8 },
  modeOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modeOptionSelected: { borderColor: '#E94560', backgroundColor: 'rgba(233,69,96,0.12)' },
  modeOptionText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  modeOptionTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  field: { gap: 4, marginTop: 8, marginBottom: 4 },
  fieldLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 12 },
  fieldHint: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontStyle: 'italic' },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 14,
  },
});
