import React, { useState } from 'react';
import { Modal, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { colors } from '../../../shared/theme';
import { useStrings } from '../../../shared/i18n';
import type { Strings } from '../../../shared/i18n';
import type { NotificationServiceStatus } from '../../../shared/bridge';
import { BackChevron, GroupCard, UrlModal } from '../components';
import { styles as chrome } from '../config.styles';
import { GroupModal } from './components/group-modal';
import {
  useNotificationChannel,
  useNotificationGroups,
  useNotificationPrefs,
  useNotificationServiceStatus,
  MAX_URLS_PER_GROUP,
  RETENTION_MAX_DAYS,
  RETENTION_MIN_DAYS,
} from './notifications.hooks';
import { styles } from './notifications.styles';

// A Switch row whose entire line (label included) is a toggle target — tapping anywhere on the
// row flips the value, not just the Switch thumb. Applied to every simple toggle in this screen;
// see the project-wide feedback this generalizes from.
function ToggleRow({
  label,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.rowDisabled]}
      activeOpacity={0.7}
      disabled={disabled}
      onPress={() => onValueChange(!value)}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        thumbColor={value ? colors.button.switch.thumb.on : colors.button.switch.thumb.off}
        trackColor={{ false: colors.button.switch.track.off, true: colors.button.switch.track.on }}
      />
    </TouchableOpacity>
  );
}

// Foreground service status → label/pill-style pair — mirrors the channel row's own
// statusPillOn/statusPillOff idiom, with 'connecting' getting a neutral third look since it's
// neither clearly ok nor clearly a problem.
function serviceStatusLabel(t: Strings, status: NotificationServiceStatus): string {
  switch (status) {
    case 'connected':
      return t.notificationsServiceStatusConnected;
    case 'connecting':
      return t.notificationsServiceStatusConnecting;
    case 'disconnected':
      return t.notificationsServiceStatusDisconnected;
    case 'stopped':
    default:
      return t.notificationsServiceStatusStopped;
  }
}

type GroupModalState = { mode: 'add' } | { mode: 'edit'; name: string; topic: string; linkedServerGroupId?: string };
type UrlModalState = { mode: 'add' } | { mode: 'edit'; urlId: string; url: string; priority: number; linkedServerUrlId?: string };

export function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const t = useStrings();
  const channel = useNotificationChannel();
  const prefs = useNotificationPrefs();
  const groups = useNotificationGroups();
  const serviceStatus = useNotificationServiceStatus();

  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [groupModal, setGroupModal] = useState<GroupModalState | null>(null);
  const [groupModalError, setGroupModalError] = useState<string | null>(null);

  const [urlModal, setUrlModal] = useState<UrlModalState | null>(null);
  const [urlModalError, setUrlModalError] = useState<string | null>(null);
  const [urlMenu, setUrlMenu] = useState<{ urlId: string; canRemove: boolean } | null>(null);

  const submitGroupModal = async (name: string, topic: string, linkedServerGroupId: string | undefined) => {
    const err =
      groupModal?.mode === 'add'
        ? await groups.addGroup(name, topic, linkedServerGroupId)
        : await groups.editGroup(name, topic, linkedServerGroupId);
    if (err) {setGroupModalError(err);}
    else {
      setGroupModal(null);
      setGroupModalError(null);
    }
  };

  const submitUrlModal = async (url: string, priority: number, linkedServerUrlId?: string) => {
    const err =
      urlModal?.mode === 'add'
        ? await groups.addUrl(url, priority, linkedServerUrlId)
        : await groups.updateUrl(urlModal!.urlId, url, priority, linkedServerUrlId);
    if (err) {setUrlModalError(err);}
    else {
      setUrlModal(null);
      setUrlModalError(null);
    }
  };

  // Nothing renders below the channel row until every real value has loaded — otherwise every
  // toggle would flash its default (off) state and visibly animate to the real one a moment
  // later. Same rule ReaderPrefsScreen already follows for its own toggles.
  const ready = channel.enabled != null && !prefs.loading && !groups.loading;

  return (
    <View style={chrome.root}>
      <View style={chrome.subHeader}>
        <BackChevron onPress={onBack} />
        <Text style={chrome.subTitle}>{t.configMenuNotifications}</Text>
      </View>

      <ScrollView contentContainerStyle={chrome.scroll}>
        {/* The channel row is not a real toggle — Android does not let this app change an
            already-created channel's enabled state; tapping it opens the system's own settings
            screen for that channel (see README Decision 10). The pill shows the current state. */}
        <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={channel.openSettings}>
          <Text style={styles.label}>{t.notificationsChannelRowLabel}</Text>
          {channel.enabled != null && (
            <View style={[styles.statusPill, channel.enabled ? styles.statusPillOn : styles.statusPillOff]}>
              <Text style={styles.statusPillTxt}>
                {channel.enabled ? t.notificationsChannelStateOn : t.notificationsChannelStateOff}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={chrome.divider} />

        {ready && channel.enabled && (
          <>
            <ToggleRow
              label={t.notificationsScopeAll}
              value={prefs.scopeAll}
              onValueChange={prefs.setScopeAll}
            />
            <View style={chrome.divider} />

            <ToggleRow
              label={t.notificationsScopeFollowedOnly}
              value={prefs.scopeFollowedOnly}
              onValueChange={prefs.setScopeFollowedOnly}
              disabled={prefs.scopeAll}
            />
            <View style={chrome.divider} />

            <ToggleRow
              label={t.notificationsGroupAcrossSeries}
              value={prefs.groupAcrossSeries}
              onValueChange={prefs.setGroupAcrossSeries}
            />
            <View style={chrome.divider} />

            <ToggleRow
              label={t.notificationsCollapseSerialChaptersNotification}
              value={prefs.collapseSerialChaptersNotification}
              onValueChange={prefs.setCollapseSerialChaptersNotification}
            />
            <View style={chrome.divider} />

            <View style={styles.retentionRow}>
              <Text style={styles.retentionLabel}>{t.notificationsRetentionLabel}</Text>
              <View style={styles.retentionStepper}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => prefs.setRetentionDays(prefs.retentionDays - 1)}
                  disabled={prefs.retentionDays <= RETENTION_MIN_DAYS}>
                  <Minus size={16} color={colors.icon.button.secondary} />
                </TouchableOpacity>
                <Text style={styles.retentionValue}>{`${prefs.retentionDays} ${t.notificationsRetentionDaysSuffix}`}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => prefs.setRetentionDays(prefs.retentionDays + 1)}
                  disabled={prefs.retentionDays >= RETENTION_MAX_DAYS}>
                  <Plus size={16} color={colors.icon.button.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sectionRow}>
              <Text style={chrome.section}>{t.notificationsGroupsTitle}</Text>
              {groups.group && serviceStatus.status != null && (
                <View
                  style={[
                    styles.statusPill,
                    serviceStatus.status === 'connected' ? styles.statusPillOn : styles.statusPillOff,
                  ]}>
                  <Text style={styles.statusPillTxt}>{serviceStatusLabel(t, serviceStatus.status)}</Text>
                </View>
              )}
            </View>

            {groups.group && (
              <GroupCard
                name={groups.group.name}
                credentialFields={[]}
                maskCredential={() => null}
                onGroupMenu={() => setGroupMenuOpen(true)}
                urls={groups.urls}
                activeUrlId={groups.activeUrlId}
                canAddUrl={groups.urls.length < MAX_URLS_PER_GROUP}
                onUrlMenu={urlId => setUrlMenu({ urlId, canRemove: groups.canRemoveUrl })}
                onAddUrl={() => {
                  setUrlModalError(null);
                  setUrlModal({ mode: 'add' });
                }}
                urlSubline={groups.linkedUrlLabel}
                connTesting={groups.connStatus === 'testing'}
                connMessage={groups.connMessage}
                connStatus={groups.connStatus}
                onTestConnection={groups.testConnection}
                strings={{
                  urls: t.serverUrlsLabel,
                  addUrl: t.serverAddUrl,
                  testConnection: t.setupTestConnection,
                  testing: t.setupTesting,
                  connectionOk: t.setupConnectionOk,
                }}
              />
            )}

            {groups.canAddGroup && (
              <TouchableOpacity
                style={styles.addDashedBtn}
                onPress={() => {
                  setGroupModalError(null);
                  setGroupModal({ mode: 'add' });
                }}>
                <Text style={styles.addDashedTxt}>{t.notificationsAddGroup}</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ── group context menu (edit + delete) ── */}
        <Modal transparent visible={groupMenuOpen} onRequestClose={() => setGroupMenuOpen(false)}>
          <TouchableOpacity style={styles.menuOverlay} onPress={() => setGroupMenuOpen(false)} activeOpacity={1}>
            <View style={styles.menuBox}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setGroupMenuOpen(false);
                  if (groups.group) {
                    setGroupModalError(null);
                    setGroupModal({
                      mode: 'edit',
                      name: groups.group.name,
                      topic: groups.group.topic,
                      linkedServerGroupId: groups.group.linkedServerGroupId,
                    });
                  }
                }}>
                <Text style={styles.menuItemTxt}>{t.serverListEdit}</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setGroupMenuOpen(false);
                  if (groups.group) {groups.removeGroup(groups.group.id);}
                }}>
                <Text style={[styles.menuItemTxt, styles.menuItemDanger]}>{t.serverListDelete}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ── URL context menu (edit + delete hidden when it's the last URL) ── */}
        <Modal transparent visible={urlMenu !== null} onRequestClose={() => setUrlMenu(null)}>
          <TouchableOpacity style={styles.menuOverlay} onPress={() => setUrlMenu(null)} activeOpacity={1}>
            <View style={styles.menuBox}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  const target = groups.urls.find(u => u.id === urlMenu?.urlId);
                  setUrlMenu(null);
                  if (target) {
                    setUrlModalError(null);
                    setUrlModal({
                      mode: 'edit',
                      urlId: target.id,
                      url: target.url,
                      priority: target.priority,
                      linkedServerUrlId: target.linkedServerUrlId,
                    });
                  }
                }}>
                <Text style={styles.menuItemTxt}>{t.serverListEdit}</Text>
              </TouchableOpacity>
              {urlMenu?.canRemove && (
                <>
                  <View style={styles.menuDivider} />
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      const id = urlMenu.urlId;
                      setUrlMenu(null);
                      groups.removeUrl(id);
                    }}>
                    <Text style={[styles.menuItemTxt, styles.menuItemDanger]}>{t.serverListDelete}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {groupModal && (
          <GroupModal
            t={t}
            mode={groupModal.mode}
            initialName={groupModal.mode === 'edit' ? groupModal.name : undefined}
            initialTopic={groupModal.mode === 'edit' ? groupModal.topic : undefined}
            initialLinkedServerGroupId={groupModal.mode === 'edit' ? groupModal.linkedServerGroupId : undefined}
            servers={groups.linkedServerGroups}
            submitError={groupModalError}
            onSubmit={submitGroupModal}
            onClose={() => {
              setGroupModal(null);
              setGroupModalError(null);
            }}
          />
        )}

        {urlModal && (
          <UrlModal
            t={t}
            mode={urlModal.mode}
            initialUrl={urlModal.mode === 'edit' ? urlModal.url : undefined}
            initialPriority={urlModal.mode === 'edit' ? urlModal.priority : groups.nextPriority}
            submitError={urlModalError}
            link={{
              servers: groups.linkedServerGroups,
              urlsOf: groups.urlsOfServerGroup,
              initialServerGroupId: groups.linkedServerGroups[0]?.id,
              initialServerUrlId: urlModal.mode === 'edit' ? urlModal.linkedServerUrlId : undefined,
            }}
            onTest={groups.testUrl}
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
