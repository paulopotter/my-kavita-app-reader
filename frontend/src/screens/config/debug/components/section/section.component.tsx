import React, { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { SmokeTestStep } from '../../debug.steps';
import { styles } from './section.styles';

// One smoke-test section: a title, an optional editable id field, a Run button, and the result
// list. Dumb — it holds only its own running/results state and calls props.onRun(). The Config
// debug screen mounts one per domain (Server, ServerService, Serials, Chapters, Pages).
export interface SectionProps {
  title: string;
  idLabel?: string;
  idValue?: string;
  onIdChange?: (v: string) => void;
  disabled?: boolean;
  onRun: () => Promise<SmokeTestStep[]>;
}

export function Section({ title, idLabel, idValue, onIdChange, disabled, onRun }: SectionProps) {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<SmokeTestStep[]>([]);

  const handleRun = async () => {
    setRunning(true);
    setSteps([]);
    const results = await onRun();
    setSteps(results);
    setRunning(false);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      {idLabel && (
        <>
          <Text style={styles.inputLabel}>{idLabel}</Text>
          <TextInput
            style={styles.input}
            value={idValue}
            onChangeText={onIdChange}
            placeholder="(not discovered — enter manually)"
            placeholderTextColor="#4A5568"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </>
      )}

      <TouchableOpacity
        style={[styles.runBtn, (running || disabled) && styles.disabled]}
        onPress={handleRun}
        disabled={running || disabled}>
        {running ? <ActivityIndicator size="small" color="#E94560" /> : <Text style={styles.runTxt}>Run {title}</Text>}
      </TouchableOpacity>

      {steps.map((step, i) => (
        <View key={i} style={styles.resultRow}>
          <View style={[styles.dot, step.ok ? styles.dotOk : styles.dotFail]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label} numberOfLines={1}>
              {step.label}
            </Text>
            <Text style={step.ok ? styles.detailOk : styles.detailFail} numberOfLines={2}>
              {step.detail}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
