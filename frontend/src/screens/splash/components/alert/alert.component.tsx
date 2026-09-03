import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { styles } from './alert.styles';

export interface SplashAlertButton {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
}

export interface SplashAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: SplashAlertButton[];
  // When false, hardware back and backdrop tap do nothing (blocking alert — the OTA "required"
  // flow uses this).
  dismissible?: boolean;
  onDismiss?: () => void;
}

// The splash's modal alert — the only alert the app raises today (the OTA advisory / hard-block).
// Dumb: the splash hook builds title/message/buttons; this only lays out the card and routes taps.
export function SplashAlert({ visible, title, message, buttons, dismissible = true, onDismiss }: SplashAlertProps) {
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
