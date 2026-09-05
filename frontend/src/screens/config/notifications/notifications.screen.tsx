import React, { useState } from 'react';
import { Modal, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../shared/theme';
import { useStrings } from '../../../shared/i18n';
import { styles as chrome } from '../config.styles';
import { GroupCard } from './components/group-card';
import { GroupModal } from './components/group-modal';
import { UrlModal } from './components/url-modal';
import { useNotificationChannel, useNotificationGroups, useNotificationPrefs, MAX_URLS_PER_GROUP } from './notifications.hooks';
import { styles } from './notifications.styles';

const RETENTION_MIN_DAYS = 1;
const RETENTION_MAX_DAYS = 365;
const RETENTION_STEP_DAYS = 1;
const RETENTION_DEFAULT_DAYS = 30;

export function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const t = useStrings();
  const channel = useNotificationChannel();
  const prefs = useNotificationPrefs();
  const groups = useNotificationGroups();

  const [groupMenu, setGroupMenu] = useState<string | null>(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalError, setGroupModalError] = useState<string | null>(null);

  const [urlMenu, setUrlMenu] = useState<{ groupId: string; urlId: string; canRemove: boolean } | null>(null);
  const [urlModal, setUrlModal] = useState<{ groupId: string; mode: 'add' } | null>(null);
  const [urlModalError, setUrlModalError] = useState<string | null>(null);

  const retentionDays = prefs.retentionDays ?? RETENTION_DEFAULT_DAYS;

  const submitGroupModal = async (name: string, topic: string) => {
    const err = await groups.addGroup(name, topic);
    if (err) {setGroupModalError(err);}
    else {
      setGroupModalOpen(false);
      setGroupModalError(null);
    }
  };

  const submitUrlModal = async (url: string, priority: number) => {
    if (!urlModal) {return;}
    const err = await groups.addUrl(urlModal.groupId, url, priority);
    if (err) {setUrlModalError(err);}
    else {
      setUrlModal(null);
      setUrlModalError(null);
    }
  };

  return (
    <View style={chrome.root}>
      <View style={chrome.subHeader}>
        <Text onPress={onBack} style={chrome.backChevron} suppressHighlighting>
          ‹
        </Text>
        <Text style={chrome.subTitle}>{t.configMenuNotifications}</Text>
      </View>

      <ScrollView contentContainerStyle={chrome.scroll}>
        {/* The channel row is not a real toggle — Android does not let this app change an
            already-created channel's enabled state; pressing it only opens the system's own
            settings screen for that channel (see README Decision 10). */}
        <View style={styles.row}>
          <Text style={styles.label}>{t.notificationsChannelRowLabel}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.channelState}>
              {channel.enabled == null ? '' : channel.enabled ? t.notificationsChannelStateOn : t.notificationsChannelStateOff}
            </Text>
            <TouchableOpacity style={styles.channelBtn} onPress={channel.openSettings}>
              <Text style={styles.channelBtnTxt}>{t.notificationsChannelOpenSettings}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={chrome.divider} />

        <View style={[styles.row, prefs.scopeFollowedOnly && styles.rowDisabled]}>
          <Text style={styles.label}>{t.notificationsScopeAll}</Text>
          <Switch
            value={prefs.scopeAll}
            onValueChange={prefs.setScopeAll}
            disabled={prefs.scopeFollowedOnly}
            thumbColor={prefs.scopeAll ? colors.accent : colors.muted}
            trackColor={{ false: colors.deep, true: '#7F1D1D' }}
          />
        </View>
        <View style={chrome.divider} />

        <View style={[styles.row, prefs.scopeAll && styles.rowDisabled]}>
          <Text style={styles.label}>{t.notificationsScopeFollowedOnly}</Text>
          <Switch
            value={prefs.scopeFollowedOnly}
            onValueChange={prefs.setScopeFollowedOnly}
            disabled={prefs.scopeAll}
            thumbColor={prefs.scopeFollowedOnly ? colors.accent : colors.muted}
            trackColor={{ false: colors.deep, true: '#7F1D1D' }}
          />
        </View>
        <View style={chrome.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>{t.notificationsGroupAcrossSeries}</Text>
          <Switch
            value={prefs.groupAcrossSeries}
            onValueChange={prefs.setGroupAcrossSeries}
            thumbColor={prefs.groupAcrossSeries ? colors.accent : colors.muted}
            trackColor={{ false: colors.deep, true: '#7F1D1D' }}
          />
        </View>
        <View style={chrome.divider} />

        <View style={styles.retentionRow}>
          <Text style={styles.retentionLabel}>{t.notificationsRetentionLabel}</Text>
          <View style={styles.retentionStepper}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => prefs.setRetentionDays(Math.max(RETENTION_MIN_DAYS, retentionDays - RETENTION_STEP_DAYS))}>
              <Text style={styles.stepperBtnTxt}>−</Text>
            </TouchableOpacity>
            <Text style={styles.retentionValue}>{`${retentionDays} ${t.notificationsRetentionDaysSuffix}`}</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => prefs.setRetentionDays(Math.min(RETENTION_MAX_DAYS, retentionDays + RETENTION_STEP_DAYS))}>
              <Text style={styles.stepperBtnTxt}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={chrome.section}>{t.notificationsGroupsTitle}</Text>

        {groups.groups.map(g => (
          <GroupCard
            key={g.id}
            name={g.name}
            onGroupMenu={() => setGroupMenu(g.id)}
            urls={groups.urlsByGroup[g.id] ?? []}
            canAddUrl={groups.canAddUrl(g.id)}
            onUrlMenu={urlId => setUrlMenu({ groupId: g.id, urlId, canRemove: groups.canRemoveUrl(g.id) })}
            onAddUrl={() => {
              setUrlModalError(null);
              setUrlModal({ groupId: g.id, mode: 'add' });
            }}
            strings={{ urls: t.serverUrlsLabel, addUrl: t.serverAddUrl }}
          />
        ))}

        <TouchableOpacity
          style={styles.addDashedBtn}
          onPress={() => {
            setGroupModalError(null);
            setGroupModalOpen(true);
          }}>
          <Text style={styles.addDashedTxt}>{t.notificationsAddGroup}</Text>
        </TouchableOpacity>

        {/* ── group context menu (delete only — no rename, see GroupModal's own doc) ── */}
        <Modal transparent visible={groupMenu !== null} onRequestClose={() => setGroupMenu(null)}>
          <TouchableOpacity style={styles.menuOverlay} onPress={() => setGroupMenu(null)} activeOpacity={1}>
            <View style={styles.menuBox}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  const id = groupMenu;
                  setGroupMenu(null);
                  if (id) {groups.removeGroup(id);}
                }}>
                <Text style={[styles.menuItemTxt, styles.menuItemDanger]}>{t.serverListDelete}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ── URL context menu (delete hidden when it's the last URL) ── */}
        <Modal transparent visible={urlMenu !== null} onRequestClose={() => setUrlMenu(null)}>
          <TouchableOpacity style={styles.menuOverlay} onPress={() => setUrlMenu(null)} activeOpacity={1}>
            <View style={styles.menuBox}>
              {urlMenu?.canRemove && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    const target = urlMenu;
                    setUrlMenu(null);
                    if (target) {groups.removeUrl(target.groupId, target.urlId);}
                  }}>
                  <Text style={[styles.menuItemTxt, styles.menuItemDanger]}>{t.serverListDelete}</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {groupModalOpen && (
          <GroupModal
            t={t}
            submitError={groupModalError}
            onSubmit={submitGroupModal}
            onClose={() => {
              setGroupModalOpen(false);
              setGroupModalError(null);
            }}
          />
        )}

        {urlModal && (
          <UrlModal
            t={t}
            mode={urlModal.mode}
            initialPriority={groups.nextPriority(urlModal.groupId)}
            submitError={urlModalError}
            onSubmit={submitUrlModal}
            onClose={() => {
              setUrlModal(null);
              setUrlModalError(null);
            }}
          />
        )}
      </ScrollView>
    </View>
  );
}

export { MAX_URLS_PER_GROUP };
