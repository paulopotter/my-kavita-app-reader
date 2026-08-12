import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

export function AppAlert({
  visible,
  title,
  message,
  buttons,
  dismissible = true,
  onDismiss,
}: AppAlertProps) {
  function handleBackdrop() {
    if (dismissible) { onDismiss?.(); }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismissible ? onDismiss : undefined}
    >
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
                onPress={btn.onPress}
              >
                <Text
                  style={[
                    styles.btnLabel,
                    btn.variant === 'primary' && styles.btnLabelPrimary,
                    btn.variant === 'destructive' && styles.btnLabelDestructive,
                    (!btn.variant || btn.variant === 'secondary') && styles.btnLabelSecondary,
                  ]}
                >
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  message: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  btnPressed: {
    opacity: 0.75,
  },
  btnPrimary: {
    backgroundColor: '#E94560',
  },
  btnDestructive: {
    backgroundColor: '#C0392B',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  btnLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  btnLabelPrimary: {
    color: '#FFFFFF',
  },
  btnLabelDestructive: {
    color: '#FFFFFF',
  },
  btnLabelSecondary: {
    color: 'rgba(255,255,255,0.80)',
  },
});
