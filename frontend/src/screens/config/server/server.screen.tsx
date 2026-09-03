import React, { useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useStrings } from '../../../shared/i18n/useStrings';
import { styles as chrome } from '../config.styles';
import { ServerModal } from './components/modal';
import { Row } from './components/row';
import { UrlModal } from './components/url-modal';
import { useServer, type ServerCredentials } from './server.hooks';
import { styles } from './server.styles';

// Server management: the server (an :server group — provider + name + credentials), its URLs,
// and the connection tests. Reached two ways:
//  - Config menu (onBack) → "manage" mode, back chevron.
//  - onboarding target (onComplete) → "setup" mode, no back, a "go to Library" CTA once a
//    server exists. config/setup renders this.
export interface ServerScreenProps {
  onBack?: () => void;
  onComplete?: () => void;
  onServerCleared?: () => void;
}

type UrlModalState = { mode: 'add' } | { mode: 'edit'; urlId: string; url: string; priority: number };

export function ServerScreen({ onBack, onComplete, onServerCleared }: ServerScreenProps) {
  const t = useStrings();
  const s = useServer({ onServerCleared });
  const isSetup = onComplete != null;

  const [serverModal, setServerModal] = useState<{ mode: 'add' | 'edit' } | null>(null);
  const [serverModalError, setServerModalError] = useState<string | null>(null);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);

  const [urlModal, setUrlModal] = useState<UrlModalState | null>(null);
  const [urlModalError, setUrlModalError] = useState<string | null>(null);
  const [urlMenu, setUrlMenu] = useState<{ urlId: string; canRemove: boolean } | null>(null);

  const providerName = s.providers[0]?.displayName ?? '';
  const hasServer = s.group != null;

  const submitServerModal = async (name: string, creds: ServerCredentials, firstUrl: string) => {
    const err =
      serverModal?.mode === 'add'
        ? await s.addServer(name, creds, firstUrl)
        : await s.updateServer(name, creds);
    if (err) {
      setServerModalError(err);
    } else {
      setServerModal(null);
      setServerModalError(null);
    }
  };

  const submitUrlModal = async (url: string, priority: number) => {
    const err =
      urlModal?.mode === 'add'
        ? await s.addUrl(url, priority)
        : await s.updateUrl(urlModal!.urlId, url, priority);
    if (err) {
      setUrlModalError(err);
    } else {
      setUrlModal(null);
      setUrlModalError(null);
    }
  };

  const header = isSetup ? (
    <View style={{ padding: 20, paddingBottom: 8 }}>
      <Text style={chrome.pageTitle}>{t.setupTitle}</Text>
      <Text style={{ color: '#A0AEC0' }}>{t.setupSubtitle}</Text>
    </View>
  ) : (
    <View style={chrome.subHeader}>
      <Text onPress={onBack} style={chrome.backChevron} suppressHighlighting>
        ‹
      </Text>
      <Text style={chrome.subTitle}>{t.configMenuServer}</Text>
    </View>
  );

  return (
    <View style={chrome.root}>
      {header}

      <ScrollView contentContainerStyle={chrome.scroll}>
        <Text style={chrome.section}>
          {providerName ? `Servidores ${providerName}` : t.configKavitaServers}
        </Text>

        {hasServer && s.group && (
          <View style={styles.groupCard}>
            {/* ── group header ── */}
            <View style={styles.groupHeader}>
              <View style={styles.groupHeaderName}>
                <View style={[styles.dot, styles.dotActive]} />
                <Text style={styles.groupName} numberOfLines={1}>
                  {s.group.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setGroupMenuOpen(true)} hitSlop={8}>
                <Text style={styles.dots}>⋯</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.groupBody}>
              {/* ── credentials (masked, no own menu — edit via the group ⋯) ── */}
              {s.providers[0]?.credentialFields.map(f => {
                const masked = s.maskedCredential(f.name);
                if (!masked) {return null;}
                return (
                  <View key={f.name}>
                    <Text style={styles.subLabel}>{f.label}</Text>
                    <View style={styles.credRow}>
                      <Text style={styles.credValue}>{masked}</Text>
                    </View>
                  </View>
                );
              })}

              {/* ── URLs ── */}
              <Text style={styles.subLabel}>URLs</Text>
              {s.urls.map(u => (
                <Row
                  key={u.id}
                  active={s.activeUrlId === u.id}
                  primary={u.url}
                  trailing={`P${u.priority}`}
                  onMenu={() => setUrlMenu({ urlId: u.id, canRemove: s.canRemoveUrl })}
                />
              ))}

              {s.canAddUrl && (
                <TouchableOpacity
                  style={styles.addDashedBtn}
                  onPress={() => {
                    setUrlModalError(null);
                    setUrlModal({ mode: 'add' });
                  }}>
                  <Text style={styles.addDashedTxt}>+ Adicionar URL</Text>
                </TouchableOpacity>
              )}

              {s.urls.length > 0 && (
                <>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.outlineBtn, s.connStatus === 'testing' && styles.btnDisabled]}
                      onPress={s.testConnection}
                      disabled={s.connStatus === 'testing'}>
                      <Text style={styles.outlineTxt}>
                        {s.connStatus === 'testing' ? t.setupTesting : t.setupTestConnection}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {s.connStatus !== 'idle' && (
                    <Text style={s.connStatus === 'ok' ? styles.msgOk : styles.msgError}>
                      {s.connStatus === 'ok'
                        ? `✓ ${t.setupConnectionOk}: ${s.connMessage}`
                        : `✗ ${s.connMessage}`}
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        {/* "Add server" — hidden once one exists (single-server rule). */}
        {!hasServer && (
          <TouchableOpacity
            style={styles.addDashedBtn}
            onPress={() => {
              setServerModalError(null);
              setServerModal({ mode: 'add' });
            }}>
            <Text style={styles.addDashedTxt}>+ Adicionar servidor</Text>
          </TouchableOpacity>
        )}

        {isSetup && hasServer && (
          <TouchableOpacity style={styles.goBtn} onPress={onComplete}>
            <Text style={styles.goTxt}>{t.setupGoToLibrary}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── group context menu ── */}
      <Modal transparent visible={groupMenuOpen} onRequestClose={() => setGroupMenuOpen(false)}>
        <TouchableOpacity style={styles.menuOverlay} onPress={() => setGroupMenuOpen(false)} activeOpacity={1}>
          <View style={styles.menuBox}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setGroupMenuOpen(false);
                setServerModalError(null);
                setServerModal({ mode: 'edit' });
              }}>
              <Text style={styles.menuItemTxt}>{t.serverListEdit}</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setGroupMenuOpen(false);
                s.removeServer();
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
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                const target = s.urls.find(x => x.id === urlMenu?.urlId);
                setUrlMenu(null);
                if (target) {
                  setUrlModalError(null);
                  setUrlModal({ mode: 'edit', urlId: target.id, url: target.url, priority: target.priority });
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
                    s.removeUrl(id);
                  }}>
                  <Text style={[styles.menuItemTxt, styles.menuItemDanger]}>{t.serverListDelete}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── add / edit server modal ── */}
      {serverModal && (
        <ServerModal
          mode={serverModal.mode}
          providers={s.providers}
          providerId={
            serverModal.mode === 'edit' ? (s.group?.providerId ?? '') : (s.providers[0]?.id ?? '')
          }
          initialName={serverModal.mode === 'edit' ? s.group?.name : undefined}
          initialCredentials={serverModal.mode === 'edit' ? s.credentials : undefined}
          submitError={serverModalError}
          onSubmit={submitServerModal}
          onClose={() => {
            setServerModal(null);
            setServerModalError(null);
          }}
        />
      )}

      {/* ── add / edit url modal ── */}
      {urlModal && (
        <UrlModal
          mode={urlModal.mode}
          initialUrl={urlModal.mode === 'edit' ? urlModal.url : undefined}
          initialPriority={urlModal.mode === 'edit' ? urlModal.priority : s.nextPriority}
          submitError={urlModalError}
          onTest={s.testUrl}
          onSubmit={submitUrlModal}
          onClose={() => {
            setUrlModal(null);
            setUrlModalError(null);
          }}
        />
      )}
    </View>
  );
}
