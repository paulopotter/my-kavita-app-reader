import React, { useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChapterSortMode } from '../../../shared/bridge/series';
import { ChapterSortConfigFields } from '../../../shared/components/ChapterSortConfigFields';
import { Strings } from '../../../shared/i18n/strings';

interface Props {
  visible: boolean;
  mode: ChapterSortMode;
  fixedThreshold?: number;
  progressPercent: number;
  hasSeriesOverride: boolean;
  t: Strings;
  onSave: (mode: ChapterSortMode, fixedThreshold: number | undefined, progressPercent: number) => void;
  onReset: () => void;
  onCancel: () => void;
}

export function ChapterSortConfigModal({
  visible,
  mode,
  fixedThreshold,
  progressPercent,
  hasSeriesOverride,
  t,
  onSave,
  onReset,
  onCancel,
}: Props) {
  const pendingRef = useRef<{ mode: ChapterSortMode; fixedThreshold: number | undefined; progressPercent: number }>({
    mode,
    fixedThreshold,
    progressPercent,
  });

  function handleSave() {
    const { mode: m, fixedThreshold: ft, progressPercent: pp } = pendingRef.current;
    onSave(m, ft, pp);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{t.seriesDetailSortConfigTitle}</Text>

          {hasSeriesOverride && (
            <Text style={styles.overrideNote}>{t.seriesDetailSortConfigOverrideNote}</Text>
          )}

          <ChapterSortConfigFields
            mode={mode}
            fixedThreshold={fixedThreshold}
            progressPercent={progressPercent}
            t={t}
            onChange={(m, ft, pp) => { pendingRef.current = { mode: m, fixedThreshold: ft, progressPercent: pp }; }}
          />

          {hasSeriesOverride && (
            <Pressable style={styles.resetBtn} onPress={onReset}>
              <Text style={styles.resetBtnText}>{t.seriesDetailSortConfigReset}</Text>
            </Pressable>
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
  overrideNote: { color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 16 },
  resetBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  resetBtnText: { color: '#E94560', fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  btn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, minWidth: 80, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#E94560' },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  btnLabelPrimary: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  btnLabelSecondary: { color: 'rgba(255,255,255,0.80)', fontSize: 14, fontWeight: '600' },
});
