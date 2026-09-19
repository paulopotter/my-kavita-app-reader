import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { confirmDialogStyles } from './confirm-dialog.styles';

import { useStyles } from '../../context';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

// Generic yes/no confirmation modal — same visual shape as the Serie screen's own sort-config
// modal (backdrop + centered card), extracted here since it isn't tied to any one screen's
// domain. A screen owns WHEN to show it and WHAT happens on confirm; this only renders the ask.
export function ConfirmDialog({ visible, title, cancelLabel, confirmLabel, onCancel, onConfirm }: ConfirmDialogProps) {
  const styles = useStyles(confirmDialogStyles);
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onCancel}>
              <Text style={styles.btnLabelSecondary}>{cancelLabel}</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onConfirm}>
              <Text style={styles.btnLabelPrimary}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
