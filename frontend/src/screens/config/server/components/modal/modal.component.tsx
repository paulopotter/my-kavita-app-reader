import React, { useMemo, useState } from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { ProviderInfo } from '../../../../../shared/bridge/server';
import type { Strings } from '../../../../../shared/i18n/strings';
import { UrlTool } from '../../../../../shared/tools/url';
import type { ServerCredentials } from '../../server.hooks';
import { styles } from './modal.styles';

// Add / edit a server (an :server group). Dumb: the screen owns providers + the submit action;
// this renders the provider select (disabled while there's only one), a name field, and one
// input per provider.credentialFields entry, with a "*" and a save-block on the required ones.
// On 'add' it also asks for the first URL (a server needs at least one) — priority is always 0
// there; further URLs and their priorities are managed by the per-URL modal afterwards.
export interface ServerModalProps {
  t: Strings;
  mode: 'add' | 'edit';
  providers: ProviderInfo[];
  // Which provider this server uses. For 'add' it's providers[0]; for 'edit' it's the group's.
  providerId: string;
  initialName?: string;
  initialCredentials?: ServerCredentials;
  submitError?: string | null;
  // 'add' passes (name, credentials, firstUrl); 'edit' ignores the third arg.
  onSubmit: (name: string, credentials: ServerCredentials, firstUrl: string) => void;
  onClose: () => void;
}

export function ServerModal({
  t,
  mode,
  providers,
  providerId,
  initialName = '',
  initialCredentials = {},
  submitError,
  onSubmit,
  onClose,
}: ServerModalProps) {
  const provider = providers.find(p => p.id === providerId) ?? providers[0];
  const fields = useMemo(() => provider?.credentialFields ?? [], [provider]);

  const [name, setName] = useState(initialName);
  const [creds, setCreds] = useState<ServerCredentials>(initialCredentials);
  const [firstUrl, setFirstUrl] = useState('');

  const missingRequired = useMemo(
    () => fields.some(f => f.required && !creds[f.name]?.trim()),
    [fields, creds],
  );
  const urlOk = mode === 'edit' || UrlTool.isValid(firstUrl);
  const canSave = name.trim().length > 0 && !missingRequired && urlOk;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'add' ? t.serverModalNewTitle : t.serverModalEditTitle}
            </Text>
            <Text onPress={onClose} style={styles.close} suppressHighlighting>
              ✕
            </Text>
          </View>

          <Text style={styles.label}>{t.serverModalProviderLabel}</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={{ color: '#FFF', fontSize: 13 }}>{provider?.displayName ?? '—'}</Text>
          </View>

          <Text style={styles.label}>{t.serverModalNameLabel}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t.serverModalNamePlaceholder}
            placeholderTextColor="#4A5568"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />

          {fields.map(f => (
            <View key={f.name}>
              <Text style={styles.label}>
                {f.label}
                {f.required ? <Text style={styles.required}> *</Text> : null}
              </Text>
              <TextInput
                style={styles.input}
                value={creds[f.name] ?? ''}
                onChangeText={v => setCreds(prev => ({ ...prev, [f.name]: v }))}
                placeholder={f.label}
                placeholderTextColor="#4A5568"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={f.type === 'secret'}
              />
            </View>
          ))}

          {mode === 'add' && (
            <>
              <Text style={styles.label}>
                {t.urlModalUrlLabel}
                <Text style={styles.required}> *</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={firstUrl}
                onChangeText={setFirstUrl}
                placeholder={t.urlModalUrlPlaceholder}
                placeholderTextColor="#4A5568"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </>
          )}

          {submitError ? <Text style={styles.errorTxt}>✗ {submitError}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelTxt}>{t.serverFormCancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
              onPress={() => canSave && onSubmit(name, creds, firstUrl)}
              disabled={!canSave}>
              <Text style={styles.saveTxt}>{t.serverFormSave}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
