import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useStyles } from '../../../../../shared/context';
import { diagnosticsLogStyles } from './diagnostics-log.styles';

// Dumb card for the local diagnostics log (debug menu): where it is, how big, the adb command that
// reads it, and the export / clear / refresh actions. Holds no state — the screen's hook owns it.
export interface DiagnosticsLogProps {
  strings: {
    title: string;
    hint: string;
    size: string;
    adb: string;
    exportLabel: string;
    clearLabel: string;
    refreshLabel: string;
  };
  // null while loading, or when the native side could not answer.
  info: { sizeLabel: string; adbCommand: string } | null;
  busy: boolean;
  onExport: () => void;
  onClear: () => void;
  onRefresh: () => void;
}

export function DiagnosticsLog({ strings, info, busy, onExport, onClear, onRefresh }: DiagnosticsLogProps) {
  const styles = useStyles(diagnosticsLogStyles);
  const actions: Array<{ label: string; onPress: () => void }> = [
    { label: strings.exportLabel, onPress: onExport },
    { label: strings.refreshLabel, onPress: onRefresh },
    { label: strings.clearLabel, onPress: onClear },
  ];
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{strings.title}</Text>
      <Text style={styles.hint}>{strings.hint}</Text>
      {info && (
        <>
          <Text style={styles.label}>{strings.size}</Text>
          <Text style={styles.value}>{info.sizeLabel}</Text>
          <Text style={styles.label}>{strings.adb}</Text>
          <Text style={styles.command} selectable>
            {info.adbCommand}
          </Text>
        </>
      )}
      <View style={styles.actions}>
        {actions.map(action => (
          <TouchableOpacity
            key={action.label}
            style={[styles.button, busy && styles.disabled]}
            onPress={action.onPress}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={action.label}>
            <Text style={styles.buttonText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
