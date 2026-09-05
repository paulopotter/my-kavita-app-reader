import React, { useState } from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { Strings } from '../../../../../shared/i18n';
import { UrlTool } from '../../../../../shared/tools/url';
import { styles } from './url-modal.styles';

// Add / edit one URL of a notification group: address + priority. No "test connection" (unlike
// config/server's UrlModal) — a notification URL is an ntfy publish/subscribe endpoint, not
// something with its own reachability probe exposed by the bridge.
export interface UrlModalProps {
  t: Strings;
  mode: 'add' | 'edit';
  initialUrl?: string;
  initialPriority: number;
  submitError?: string | null;
  onSubmit: (url: string, priority: number) => void;
  onClose: () => void;
}

export function UrlModal({ t, mode, initialUrl = '', initialPriority, submitError, onSubmit, onClose }: UrlModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [priority, setPriority] = useState(String(initialPriority));
  const [urlError, setUrlError] = useState('');

  const urlValid = UrlTool.isValid(url);

  const handleSubmit = () => {
    if (!urlValid) {
      setUrlError(t.notificationsErrorUrlInvalid);
      return;
    }
    onSubmit(url, parseInt(priority, 10) || 0);
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{mode === 'add' ? t.notificationsUrlModalNewTitle : t.notificationsUrlModalEditTitle}</Text>
            <Text onPress={onClose} style={styles.close} suppressHighlighting>
              ✕
            </Text>
          </View>

          <Text style={styles.label}>{t.notificationsUrlModalUrlLabel}</Text>
          <TextInput
            style={[styles.input, urlError ? styles.inputError : null]}
            value={url}
            onChangeText={v => {
              setUrl(v);
              setUrlError('');
            }}
            placeholder={t.notificationsUrlModalUrlPlaceholder}
            placeholderTextColor="#4A5568"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {urlError ? <Text style={styles.errorTxt}>{urlError}</Text> : null}

          <Text style={styles.label}>{t.serverFormPriorityLabel}</Text>
          <TextInput
            style={styles.input}
            value={priority}
            onChangeText={v => setPriority(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#4A5568"
          />

          {submitError ? <Text style={styles.errorTxt}>✗ {submitError}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelTxt}>{t.serverFormCancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !urlValid && styles.saveBtnDisabled]}
              onPress={handleSubmit}
              disabled={!urlValid}>
              <Text style={styles.saveTxt}>{t.serverFormSave}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
