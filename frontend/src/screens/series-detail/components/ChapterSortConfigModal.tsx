import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChapterSortMode } from '../../../shared/bridge/series';
import { Strings } from '../../../shared/i18n/strings';
import { parseSortConfigInput, sortModeLabel } from '../SeriesDetailTransform';

const MODES: ChapterSortMode[] = ['ASCENDING', 'DESCENDING', 'AUTO_FIXED', 'AUTO_PROGRESS'];

interface Props {
  visible: boolean;
  mode: ChapterSortMode;
  fixedThreshold?: number;
  progressPercent: number;
  t: Strings;
  onSave: (mode: ChapterSortMode, fixedThreshold: number | undefined, progressPercent: number) => void;
  onCancel: () => void;
}

export function ChapterSortConfigModal({
  visible,
  mode,
  fixedThreshold,
  progressPercent,
  t,
  onSave,
  onCancel,
}: Props) {
  const [selectedMode, setSelectedMode] = useState<ChapterSortMode>(mode);
  const [thresholdText, setThresholdText] = useState(String(fixedThreshold ?? ''));
  const [progressText, setProgressText] = useState(String(progressPercent));

  function handleSave() {
    const parsed = parseSortConfigInput(thresholdText, progressText, progressPercent);
    onSave(selectedMode, parsed.fixedThreshold, parsed.progressPercent);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{t.seriesDetailSortConfigTitle}</Text>

          <View style={styles.modeList}>
            {MODES.map(m => (
              <Pressable
                key={m}
                style={[styles.modeOption, selectedMode === m && styles.modeOptionSelected]}
                onPress={() => setSelectedMode(m)}>
                <Text style={[styles.modeOptionText, selectedMode === m && styles.modeOptionTextSelected]}>
                  {sortModeLabel(m, fixedThreshold, progressPercent, t)}
                </Text>
              </Pressable>
            ))}
          </View>

          {selectedMode === 'AUTO_FIXED' && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t.seriesDetailSortConfigFixedThresholdLabel}</Text>
              <TextInput
                style={styles.input}
                value={thresholdText}
                onChangeText={setThresholdText}
                keyboardType="numeric"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
            </View>
          )}

          {selectedMode === 'AUTO_PROGRESS' && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t.seriesDetailSortConfigProgressPercentLabel}</Text>
              <TextInput
                style={styles.input}
                value={progressText}
                onChangeText={setProgressText}
                keyboardType="numeric"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
            </View>
          )}

          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onCancel}>
              <Text style={styles.btnLabelSecondary}>{t.seriesDetailSortConfigCancel}</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={handleSave}>
              <Text style={styles.btnLabelPrimary}>{t.seriesDetailSortConfigSave}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#16213E',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 24,
    width: '100%',
    gap: 12,
  },
  title: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
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
  field: { gap: 4 },
  fieldLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 14,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  btn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, minWidth: 80, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#E94560' },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  btnLabelPrimary: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  btnLabelSecondary: { color: 'rgba(255,255,255,0.80)', fontSize: 14, fontWeight: '600' },
});
