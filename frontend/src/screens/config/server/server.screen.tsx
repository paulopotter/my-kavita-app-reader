import React, { useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { ServerGroupInfo, ServerUrlInfo } from '../../../shared/bridge';
import { useStrings } from '../../../shared/i18n';
import { styles as chrome } from '../config.styles';
import { GroupCard } from './components/group-card';
import { ServerModal } from './components/modal';
import { UrlModal } from './components/url-modal';
import {
  useMetadataServer,
  useServer,
  type ServerCredentials,
  type UseMetadataServerResult,
  type UseServerResult,
} from './server.hooks';
import { styles } from './server.styles';

// Server management: the server itself + a section for a metadata server. Reached two ways:
//  - Config menu (onBack) → "manage" mode, back chevron.
//  - onboarding target (onComplete) → "setup" mode, no back, a "go to Library" CTA once a
//    server exists. config/setup renders this. The metadata section is optional in both.
export interface ServerScreenProps {
  onBack?: () => void;
  onComplete?: () => void;
  onServerCleared?: () => void;
}

export function ServerScreen({ onBack, onComplete, onServerCleared }: ServerScreenProps) {
  const t = useStrings();
  const server = useServer({ onServerCleared });
  const metadata = useMetadataServer();
  const isSetup = onComplete != null;

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
        <ServerSection
          hook={server}
          sectionTitle={
            server.providers[0]?.displayName
              ? t.serverSectionTitle.replace('{0}', server.providers[0].displayName)
              : t.configKavitaServers
          }
          addServerLabel={t.serverAddServer}
        />

        {/* The metadata section only makes sense once a server exists (it links to one). */}
        {server.group && (
          <View style={{ marginTop: 16 }}>
            <ServerSection
              hook={metadata}
              sectionTitle={
                metadata.providers[0]?.displayName
                  ? t.serverSectionTitle.replace('{0}', metadata.providers[0].displayName)
                  : t.serverMetadataSectionFallback
              }
              addServerLabel={t.serverAddMetadataServer}
              link={{ servers: metadata.linkedServerGroups, urlsOf: metadata.urlsOfServerGroup }}
              urlSubline={metadata.linkedUrlLabel}
            />
          </View>
        )}

        {isSetup && server.group && (
          <TouchableOpacity style={styles.goBtn} onPress={onComplete}>
            <Text style={styles.goTxt}>{t.setupGoToLibrary}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ── ServerSection ────────────────────────────────────────────────────────────
// One section (server OR metadata server) + its card, its two context menus, and its two
// modals. Both hooks expose the same surface for what the section needs — `link` is only passed
// for the metadata section (adds the "associate to a server URL" pickers to the URL modal).
type SectionHook = UseServerResult | UseMetadataServerResult;

function ServerSection({
  hook,
  sectionTitle,
  addServerLabel,
  link,
  urlSubline,
}: {
  hook: SectionHook;
  sectionTitle: string;
  addServerLabel: string;
  link?: { servers: ServerGroupInfo[]; urlsOf: (id: string) => Promise<ServerUrlInfo[]> };
  urlSubline?: (urlId: string) => string | undefined;
}) {
  const t = useStrings();

  const [serverModal, setServerModal] = useState<{ mode: 'add' | 'edit' } | null>(null);
  const [serverModalError, setServerModalError] = useState<string | null>(null);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);

  const [urlModal, setUrlModal] = useState<
    { mode: 'add' } | { mode: 'edit'; urlId: string; url: string; priority: number; linkedServerUrlId?: string } | null
  >(null);
  const [urlModalError, setUrlModalError] = useState<string | null>(null);
  const [urlMenu, setUrlMenu] = useState<{ urlId: string; canRemove: boolean } | null>(null);

  const hasGroup = hook.group != null;

  const submitServerModal = async (name: string, creds: ServerCredentials, firstUrl: string) => {
    const err =
      serverModal?.mode === 'add'
        ? await hook.addServer(name, creds, firstUrl)
        : await hook.updateServer(name, creds);
    if (err) {setServerModalError(err);}
    else {
      setServerModal(null);
      setServerModalError(null);
    }
  };

  const submitUrlModal = async (url: string, priority: number, linkedServerUrlId?: string) => {
    const err =
      urlModal?.mode === 'add'
        ? await hook.addUrl(url, priority, linkedServerUrlId)
        : await hook.updateUrl(urlModal!.urlId, url, priority, linkedServerUrlId);
    if (err) {setUrlModalError(err);}
    else {
      setUrlModal(null);
      setUrlModalError(null);
    }
  };

  return (
    <>
      <Text style={chrome.section}>{sectionTitle}</Text>

      {hasGroup && hook.group && (
        <GroupCard
          name={hook.group.name}
          credentialFields={hook.providers[0]?.credentialFields ?? []}
          maskCredential={hook.maskedCredential}
          onGroupMenu={() => setGroupMenuOpen(true)}
          urls={hook.urls}
          activeUrlId={hook.activeUrlId}
          canAddUrl={hook.canAddUrl}
          onUrlMenu={urlId => setUrlMenu({ urlId, canRemove: hook.canRemoveUrl })}
          urlSubline={urlSubline}
          onAddUrl={() => {
            setUrlModalError(null);
            setUrlModal({ mode: 'add' });
          }}
          connTesting={hook.connStatus === 'testing'}
          connMessage={hook.connMessage}
          connStatus={hook.connStatus}
          onTestConnection={hook.testConnection}
          strings={{
            urls: t.serverUrlsLabel,
            addUrl: t.serverAddUrl,
            testConnection: t.setupTestConnection,
            testing: t.setupTesting,
            connectionOk: t.setupConnectionOk,
          }}
        />
      )}

      {!hasGroup && (
        <TouchableOpacity
          style={styles.addDashedBtn}
          onPress={() => {
            setServerModalError(null);
            setServerModal({ mode: 'add' });
          }}>
          <Text style={styles.addDashedTxt}>{addServerLabel}</Text>
        </TouchableOpacity>
      )}

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
                hook.removeServer();
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
                const target = hook.urls.find(x => x.id === urlMenu?.urlId);
                setUrlMenu(null);
                if (target) {
                  setUrlModalError(null);
                  setUrlModal({
                    mode: 'edit',
                    urlId: target.id,
                    url: target.url,
                    priority: target.priority,
                    linkedServerUrlId: (target as { linkedServerUrlId?: string }).linkedServerUrlId,
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
                    hook.removeUrl(id);
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
          t={t}
          mode={serverModal.mode}
          providers={hook.providers}
          providerId={
            serverModal.mode === 'edit'
              ? (hook.group?.providerId ?? '')
              : (hook.providers[0]?.id ?? '')
          }
          initialName={serverModal.mode === 'edit' ? hook.group?.name : undefined}
          initialCredentials={serverModal.mode === 'edit' ? hook.credentials : undefined}
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
          t={t}
          mode={urlModal.mode}
          initialUrl={urlModal.mode === 'edit' ? urlModal.url : undefined}
          initialPriority={urlModal.mode === 'edit' ? urlModal.priority : hook.nextPriority}
          submitError={urlModalError}
          link={
            link
              ? {
                  servers: link.servers,
                  urlsOf: link.urlsOf,
                  initialServerGroupId: link.servers[0]?.id,
                  initialServerUrlId: urlModal.mode === 'edit' ? urlModal.linkedServerUrlId : undefined,
                }
              : undefined
          }
          onTest={hook.testUrl}
          onSubmit={submitUrlModal}
          onClose={() => {
            setUrlModal(null);
            setUrlModalError(null);
          }}
        />
      )}
    </>
  );
}
