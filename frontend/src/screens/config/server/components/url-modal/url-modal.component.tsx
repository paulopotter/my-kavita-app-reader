import React, { useState } from 'react';
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { UrlProbeResult } from '../../../../../shared/bridge/server';
import { UrlTool } from '../../../../../shared/tools/url';
import { styles } from './url-modal.styles';

// Add / edit one URL of a server: the address + its priority, plus a "test connection" that
// only checks THIS url is reachable right now (it never changes which URL is active — that's
// the group section's own "test connection"). Dumb: the screen owns the submit + the probe call.
export interface UrlModalProps {
  mode: 'add' | 'edit';
  initialUrl?: string;
  initialPriority: number;
  submitError?: string | null;
  onTest: (url: string) => Promise<UrlProbeResult>;
  onSubmit: (url: string, priority: number) => void;
  onClose: () => void;
}

export function UrlModal({
  mode,
  initialUrl = '',
  initialPriority,
  submitError,
  onTest,
  onSubmit,
  onClose,
}: UrlModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [priority, setPriority] = useState(String(initialPriority));
  const [urlError, setUrlError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);

  const urlValid = UrlTool.isValid(url);

  const handleTest = async () => {
    if (!urlValid) {
      setUrlError('URL inválida (use http:// ou https://)');
      return;
    }
    setUrlError('');
    setTesting(true);
    setTestResult(null);
    const result = await onTest(url);
    setTestResult(result.ok ? 'ok' : 'fail');
    setTesting(false);
  };

  const handleSubmit = () => {
    if (!urlValid) {
      setUrlError('URL inválida (use http:// ou https://)');
      return;
    }
    onSubmit(url, parseInt(priority, 10) || 0);
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{mode === 'add' ? 'Nova URL' : 'Editar URL'}</Text>
            <Text onPress={onClose} style={styles.close} suppressHighlighting>
              ✕
            </Text>
          </View>

          <Text style={styles.label}>URL</Text>
          <TextInput
            style={[styles.input, urlError ? styles.inputError : null]}
            value={url}
            onChangeText={v => {
              setUrl(v);
              setUrlError('');
              setTestResult(null);
            }}
            placeholder="http://192.168.1.100:5000"
            placeholderTextColor="#4A5568"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {urlError ? <Text style={styles.errorTxt}>{urlError}</Text> : null}

          <Text style={styles.label}>Prioridade</Text>
          <TextInput
            style={styles.input}
            value={priority}
            onChangeText={v => setPriority(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#4A5568"
          />

          <View style={styles.testRow}>
            <TouchableOpacity style={styles.testBtn} onPress={handleTest} disabled={testing}>
              <Text style={styles.testTxt}>Testar conexão</Text>
            </TouchableOpacity>
            {testing && (
              <View style={styles.testStatus}>
                <ActivityIndicator size="small" color="#E94560" />
                <Text style={styles.testMuted}>testando…</Text>
              </View>
            )}
            {!testing && testResult === 'ok' && <Text style={styles.testOk}>✓ conectou</Text>}
            {!testing && testResult === 'fail' && <Text style={styles.testFail}>✗ falhou</Text>}
          </View>

          {submitError ? <Text style={styles.errorTxt}>✗ {submitError}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !urlValid && styles.saveBtnDisabled]}
              onPress={handleSubmit}
              disabled={!urlValid}>
              <Text style={styles.saveTxt}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
