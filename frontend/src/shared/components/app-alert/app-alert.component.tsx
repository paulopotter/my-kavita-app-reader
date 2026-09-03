import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { styles } from './app-alert.styles';

export interface AppAlertButton {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
}

export interface AppAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  // When false, hardware back and backdrop tap do nothing (blocking alert).
  dismissible?: boolean;
  onDismiss?: () => void;
}

// Generic modal alert. Dumb — the caller owns visibility, the copy, and every button's action;
// this only lays out the card and routes taps. `dismissible: false` makes it a hard block
// (backdrop + hardware back inert), used by the OTA "required" flow.
export function AppAlert({ visible, title, message, buttons, dismissible = true, onDismiss }: AppAlertProps) {
  function handleBackdrop() {
    if (dismissible) {
      onDismiss?.();
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismissible ? onDismiss : undefined}>
      <Pressable style={styles.backdrop} onPress={handleBackdrop}>
        {/* Inner Pressable stops tap propagation from the card to the backdrop */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            {buttons.map((btn, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  styles.btn,
                  btn.variant === 'primary' && styles.btnPrimary,
                  btn.variant === 'destructive' && styles.btnDestructive,
                  (!btn.variant || btn.variant === 'secondary') && styles.btnSecondary,
                  pressed && styles.btnPressed,
                ]}
                onPress={btn.onPress}>
                <Text
                  style={[
                    styles.btnLabel,
                    btn.variant === 'primary' && styles.btnLabelPrimary,
                    btn.variant === 'destructive' && styles.btnLabelDestructive,
                    (!btn.variant || btn.variant === 'secondary') && styles.btnLabelSecondary,
                  ]}>
                  {btn.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
