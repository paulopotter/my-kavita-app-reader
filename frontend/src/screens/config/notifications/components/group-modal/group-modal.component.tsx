import React, { useState } from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { ServerGroupInfo } from '../../../../../shared/bridge';
import type { Strings } from '../../../../../shared/i18n';
import { Select } from '../../../components/select';
import { styles } from './group-modal.styles';

// Add a notification group (a :notifications group, ntfy provider only for now — no provider
// picker like config/server has, since there's only the one). Edit is not offered: a group's
// name/topic changes would require re-subscribing the connection, out of this task's scope — only
// add/remove are exposed (removing and re-adding covers the rename case). `servers` is the Kavita
// server list (today just one, per the single-server rule) — picking one sets
// linkedServerGroupId, same "link to a Kavita server group" concept ExternalMetadataGroupInfo
// already has.
export interface GroupModalProps {
  t: Strings;
  servers?: ServerGroupInfo[];
  submitError?: string | null;
  onSubmit: (name: string, topic: string, linkedServerGroupId: string | undefined) => void;
  onClose: () => void;
}

export function GroupModal({ t, servers = [], submitError, onSubmit, onClose }: GroupModalProps) {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [linkedServerGroupId, setLinkedServerGroupId] = useState<string | undefined>(undefined);

  const canSave = name.trim().length > 0 && topic.trim().length > 0;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.notificationsGroupModalNewTitle}</Text>
            <Text onPress={onClose} style={styles.close} suppressHighlighting>
              ✕
            </Text>
          </View>

          <Text style={styles.label}>{t.notificationsGroupModalNameLabel}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t.notificationsGroupModalNamePlaceholder}
            placeholderTextColor="#4A5568"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />

          <Text style={styles.label}>{t.notificationsGroupModalTopicLabel}</Text>
          <TextInput
            style={styles.input}
            value={topic}
            onChangeText={setTopic}
            placeholder={t.notificationsGroupModalTopicPlaceholder}
            placeholderTextColor="#4A5568"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {servers.length > 0 && (
            <>
              <Text style={styles.label}>{t.urlModalServerLabel}</Text>
              <Select
                value={linkedServerGroupId}
                placeholder={t.urlModalPickServer}
                options={servers.map(s => ({ id: s.id, label: s.name }))}
                onChange={setLinkedServerGroupId}
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
              onPress={() => canSave && onSubmit(name, topic, linkedServerGroupId)}
              disabled={!canSave}>
              <Text style={styles.saveTxt}>{t.serverFormSave}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
