import React, { useRef } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { ChapterSortConfigFields } from '../../../../shared/components/ChapterSortConfigFields';
import type { Strings } from '../../../../shared/i18n/strings';
import type { ChapterSortMode } from '../../serie.types';
import { styles } from './chapter-sort-config-modal.styles';

interface Props {
  visible: boolean;
  mode: ChapterSortMode;
  fixedThreshold?: number;
  progressPercent: number;
  hasSeriesOverride: boolean;
  t: Strings;
  onSave: (args: { mode: ChapterSortMode; fixedThreshold: number | undefined; progressPercent: number }) => void;
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
    onSave(pendingRef.current);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{t.seriesDetailSortConfigTitle}</Text>

          {hasSeriesOverride && <Text style={styles.overrideNote}>{t.seriesDetailSortConfigOverrideNote}</Text>}

          <ChapterSortConfigFields
            mode={mode}
            fixedThreshold={fixedThreshold}
            progressPercent={progressPercent}
            t={t}
            onChange={(m, ft, pp) => {
              pendingRef.current = { mode: m as ChapterSortMode, fixedThreshold: ft, progressPercent: pp };
            }}
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
