import React, { useState } from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import type { ServerGroupInfo } from '../../../../../shared/bridge';
import type { Strings } from '../../../../../shared/i18n';
import { colors } from '../../../../../shared/theme';
import { Select } from '../../../components/select';
import { styles } from './group-modal.styles';

// Add / edit a notification group (a :notifications group, ntfy provider only for now — no
// provider picker like config/server has, since there's only the one). `servers` is the Kavita
// server list (today just one, per the single-server rule) — picking one sets
// linkedServerGroupId, same "link to a Kavita server group" concept ExternalMetadataGroupInfo
// already has. With a single server the picker is pre-selected and disabled, same as UrlModal's
// own server picker.
export interface GroupModalProps {
  t: Strings;
  mode: 'add' | 'edit';
  initialName?: string;
  initialTopic?: string;
  initialLinkedServerGroupId?: string;
  servers?: ServerGroupInfo[];
  submitError?: string | null;
  onSubmit: (name: string, topic: string, linkedServerGroupId: string | undefined) => void;
  onClose: () => void;
}

export function GroupModal({
  t,
  mode,
  initialName = '',
  initialTopic = '',
  initialLinkedServerGroupId,
  servers = [],
  submitError,
  onSubmit,
  onClose,
}: GroupModalProps) {
  const [name, setName] = useState(initialName);
  const [topic, setTopic] = useState(initialTopic);
  const [linkedServerGroupId, setLinkedServerGroupId] = useState<string | undefined>(
    initialLinkedServerGroupId ?? servers[0]?.id,
  );

  const canSave = name.trim().length > 0 && topic.trim().length > 0;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'add' ? t.notificationsGroupModalNewTitle : t.notificationsGroupModalEditTitle}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={18} color={colors.muted} />
            </TouchableOpacity>
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
                disabled={servers.length <= 1}
                onChange={setLinkedServerGroupId}
              />
            </>
          )}

          {submitError ? (
            <View style={styles.submitErrorRow}>
              <X size={12} color={colors.msgError} />
              <Text style={styles.submitErrorTxt}>{submitError}</Text>
            </View>
          ) : null}

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
