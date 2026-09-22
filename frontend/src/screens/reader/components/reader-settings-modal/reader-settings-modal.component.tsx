import React from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { readerSettingsModalStyles } from './reader-settings-modal.styles';
import { useTheme, useStyles } from '../../../../shared/context';
import { useReaderPrefs } from '../../../config/reader/reader.hooks';
import { ReaderProgressIndicatorFields } from '../reader-progress-indicator-fields';
import type { Strings } from '../../../../shared/i18n';

export interface ReaderSettingsModalProps {
  visible: boolean;
  t: Strings;
  onClose: () => void;
}

// The reading-preferences toggles, reachable from inside the reader's own overlay — same prefs,
// same persistence (useReaderPrefs, shared verbatim with Ajustes > Reading), just a second place
// to reach them so the user never has to leave the page they're reading to change one. Also hosts
// ReaderProgressIndicatorFields (colour + position) — the exact same fields Ajustes > Reading
// shows, not a re-implementation of them.
export function ReaderSettingsModal({ visible, t, onClose }: ReaderSettingsModalProps) {
  const { colors } = useTheme();
  const styles = useStyles(readerSettingsModalStyles);
  const { prefs, update } = useReaderPrefs();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{t.readerSettingsButtonLabel}</Text>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {prefs && (
              <>
                <Pressable
                  style={styles.row}
                  onPress={() => update({ keepScreenOnDuringReading: !prefs.keepScreenOnDuringReading })}>
                  <Text style={styles.label}>{t.configKeepScreenOn}</Text>
                  <Switch
                    value={prefs.keepScreenOnDuringReading}
                    onValueChange={v => update({ keepScreenOnDuringReading: v })}
                    thumbColor={prefs.keepScreenOnDuringReading ? colors.button.switch.thumb.on : colors.button.switch.thumb.off}
                    trackColor={{ false: colors.button.switch.track.off, true: colors.button.switch.track.on }}
                  />
                </Pressable>
                <View style={styles.divider} />
                <Pressable
                  style={styles.row}
                  onPress={() => update({ immersiveModeDuringReading: !prefs.immersiveModeDuringReading })}>
                  <Text style={styles.label}>{t.configImmersiveMode}</Text>
                  <Switch
                    value={prefs.immersiveModeDuringReading}
                    onValueChange={v => update({ immersiveModeDuringReading: v })}
                    thumbColor={prefs.immersiveModeDuringReading ? colors.button.switch.thumb.on : colors.button.switch.thumb.off}
                    trackColor={{ false: colors.button.switch.track.off, true: colors.button.switch.track.on }}
                  />
                </Pressable>
                <View style={styles.divider} />

                <ReaderProgressIndicatorFields
                  t={t}
                  position={prefs.progressBarPosition}
                  onChangePosition={value => update({ progressBarPosition: value })}
                />
              </>
            )}
          </ScrollView>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>{t.readerSettingsCloseButtonLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
