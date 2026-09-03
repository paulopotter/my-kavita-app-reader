import React, { useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useStrings } from '../../../shared/i18n/useStrings';
import { UrlTool } from '../../../shared/tools/url';
import { styles as chrome } from '../config.styles';
import { Form } from './components/form';
import { Row } from './components/row';
import { useServer } from './server.hooks';
import { styles } from './server.styles';
import type { MenuState } from './server.types';

// The server-management screen: Kavita URLs, the API key, and BFF servers. Reached two ways:
//  - from the Config menu (onBack given) → "manage" mode, back chevron in the header.
//  - as the onboarding target (onComplete given) → "setup" mode, no back, a "go to Library" CTA
//    once a server + key are in place. The onboarding screen (config/setup) renders this.
// Exactly one of onBack / onComplete is passed.
export interface ServerScreenProps {
  onBack?: () => void;
  onComplete?: () => void;
  onServerCleared?: () => void;
}

export function ServerScreen({ onBack, onComplete, onServerCleared }: ServerScreenProps) {
  const t = useStrings();
  const s = useServer({ onServerCleared });
  const isSetup = onComplete != null;

  const [menu, setMenu] = useState<MenuState | null>(null);

  const [kavitaForm, setKavitaForm] = useState<{ url: string; editingId: string | null; error: string } | null>(null);
  const [apiKeyForm, setApiKeyForm] = useState<{ value: string } | null>(null);
  const [bffForm, setBffForm] = useState<{
    url: string;
    path: string;
    linkedId: string | undefined;
    editingId: string | null;
    error: string;
  } | null>(null);

  const hasServers = s.servers.length > 0;
  const canFinishSetup = hasServers && !!s.auth?.apiKey;

  // ── header ──
  const header = isSetup ? (
    <View style={{ padding: 20, paddingBottom: 8 }}>
      <Text style={chrome.pageTitle}>{t.setupTitle}</Text>
      <Text style={{ color: '#A0AEC0', paddingHorizontal: 0 }}>{t.setupSubtitle}</Text>
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
      <ContextMenu menu={menu} t={t} onClose={() => setMenu(null)}
        onEdit={() => {
          if (menu?.type === 'kavita') {
            const found = s.servers.find(x => x.id === menu.id);
            if (found) {setKavitaForm({ url: found.url, editingId: found.id, error: '' });}
          } else if (menu?.type === 'bff') {
            const found = s.bffServers.find(x => x.id === menu.id);
            if (found) {
              setBffForm({
                url: found.url,
                path: found.healthCheckPath || '/manga',
                linkedId: found.linkedKavitaServerConfigId,
                editingId: found.id,
                error: '',
              });
            }
          } else if (menu?.type === 'apikey') {
            setApiKeyForm({ value: '' });
          }
          setMenu(null);
        }}
        onDelete={() => {
          if (menu?.type === 'kavita') {s.deleteKavitaUrl(menu.id);}
          else if (menu?.type === 'bff') {s.deleteBff(menu.id);}
          else if (menu?.type === 'apikey') {s.deleteApiKey();}
          setMenu(null);
        }}
      />

      {header}

      <ScrollView contentContainerStyle={chrome.scroll}>
        {/* ── Kavita URLs ── */}
        <Text style={chrome.section}>{t.configKavitaServers}</Text>

        {s.servers.map(srv => (
          <Row
            key={srv.id}
            active={s.activeKavitaUrl !== '' && UrlTool.sameLocation(srv.url, s.activeKavitaUrl)}
            primary={srv.url}
            onMenu={() => setMenu({ type: 'kavita', id: srv.id })}
          />
        ))}

        {kavitaForm ? (
          <Form
            editingLabel={kavitaForm.editingId ? `Editando: ${kavitaForm.url}` : undefined}
            layout="inline"
            fields={[
              {
                key: 'url',
                value: kavitaForm.url,
                onChange: v => setKavitaForm({ ...kavitaForm, url: v, error: '' }),
                placeholder: t.serverFormUrlPlaceholder,
                error: kavitaForm.error,
                autoFocus: true,
              },
            ]}
            onSubmit={async () => {
              const err = await s.saveKavitaUrl(kavitaForm.url, kavitaForm.editingId);
              if (err) {setKavitaForm({ ...kavitaForm, error: err });}
              else {setKavitaForm(null);}
            }}
            onCancel={() => setKavitaForm(null)}
          />
        ) : (
          <TouchableOpacity style={styles.addDashedBtn} onPress={() => setKavitaForm({ url: '', editingId: null, error: '' })}>
            <Text style={styles.addDashedTxt}>{t.configAddServer}</Text>
          </TouchableOpacity>
        )}

        {hasServers && (
          <>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.outlineBtn, s.connStatus === 'testing' && styles.btnDisabled]}
                onPress={s.testKavitaConnection}
                disabled={s.connStatus === 'testing'}>
                <Text style={styles.outlineTxt}>{s.connStatus === 'testing' ? t.setupTesting : t.setupTestConnection}</Text>
              </TouchableOpacity>
            </View>
            {s.connStatus !== 'idle' && (
              <Text style={s.connStatus === 'ok' ? styles.msgOk : styles.msgError}>
                {s.connStatus === 'ok' ? `✓ ${t.setupConnectionOk}: ${s.connMessage}` : `✗ ${s.connMessage}`}
              </Text>
            )}
          </>
        )}

        {/* ── Auth ── */}
        {hasServers && (
          <>
            <Text style={chrome.section}>{t.configAuth}</Text>

            {s.maskedApiKey && !apiKeyForm && (
              <Row active primary={s.maskedApiKey} onMenu={() => setMenu({ type: 'apikey', id: 'apikey' })} />
            )}

            {apiKeyForm ? (
              <Form
                layout="inline"
                fields={[
                  {
                    key: 'apikey',
                    label: t.setupApiKeyLabel,
                    value: apiKeyForm.value,
                    onChange: v => setApiKeyForm({ value: v }),
                    placeholder: t.apiKeyPlaceholder,
                    autoFocus: true,
                  },
                ]}
                submitting={s.authStatus === 'loading'}
                onSubmit={async () => {
                  await s.saveApiKey(apiKeyForm.value);
                  setApiKeyForm(null);
                }}
                onCancel={() => setApiKeyForm(null)}
              />
            ) : !s.maskedApiKey ? (
              <TouchableOpacity style={styles.addDashedBtn} onPress={() => setApiKeyForm({ value: '' })}>
                <Text style={styles.addDashedTxt}>+ {t.setupApiKeyLabel}</Text>
              </TouchableOpacity>
            ) : null}

            {s.authStatus === 'error' && <Text style={styles.msgError}>✗ {s.authMessage}</Text>}
          </>
        )}

        {/* ── BFF ── */}
        {hasServers && (
          <>
            <Text style={chrome.section}>{t.setupBffSection}</Text>

            {s.bffServers.map(b => {
              const linked = s.servers.find(x => x.id === b.linkedKavitaServerConfigId);
              return (
                <Row
                  key={b.id}
                  active={s.activeBffUrl !== '' && UrlTool.sameLocation(b.url, s.activeBffUrl)}
                  primary={`${b.url}${b.healthCheckPath}`}
                  secondary={linked ? `↳ ${linked.url}` : `${t.bffLinkKavitaLabel}: —`}
                  secondaryEmpty={!linked}
                  onMenu={() => setMenu({ type: 'bff', id: b.id })}
                />
              );
            })}

            {bffForm ? (
              <Form
                editingLabel={bffForm.editingId ? `Editando: ${bffForm.url}` : undefined}
                layout="block"
                fields={[
                  {
                    key: 'url',
                    label: t.bffUrlLabel,
                    value: bffForm.url,
                    onChange: v => setBffForm({ ...bffForm, url: v, error: '' }),
                    placeholder: t.bffUrlPlaceholder,
                    error: bffForm.error,
                    full: true,
                    autoFocus: true,
                  },
                  {
                    key: 'path',
                    label: t.bffPathLabel,
                    value: bffForm.path,
                    onChange: v => setBffForm({ ...bffForm, path: v }),
                    placeholder: '/manga',
                    full: true,
                  },
                ]}
                choice={{
                  label: t.bffLinkKavitaLabel,
                  selectedId: bffForm.linkedId,
                  onSelect: id => setBffForm({ ...bffForm, linkedId: id }),
                  options: [
                    { id: undefined, label: t.bffLinkKavitaNone },
                    ...s.servers.map(srv => ({ id: srv.id, label: srv.url })),
                  ],
                }}
                onSubmit={async () => {
                  const err = await s.saveBff(bffForm.url, bffForm.path, bffForm.linkedId, bffForm.editingId);
                  if (err) {setBffForm({ ...bffForm, error: err });}
                  else {setBffForm(null);}
                }}
                onCancel={() => setBffForm(null)}
              />
            ) : (
              <TouchableOpacity
                style={styles.addDashedBtn}
                onPress={() => setBffForm({ url: '', path: '/manga', linkedId: undefined, editingId: null, error: '' })}>
                <Text style={styles.addDashedTxt}>{t.bffAddServer}</Text>
              </TouchableOpacity>
            )}

            {s.bffServers.length > 0 && (
              <>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.outlineBtn, s.bffStatus === 'testing' && styles.btnDisabled]}
                    onPress={s.testBffConnection}
                    disabled={s.bffStatus === 'testing'}>
                    <Text style={styles.outlineTxt}>
                      {s.bffStatus === 'testing' ? t.setupTesting : t.setupBffTestConnection}
                    </Text>
                  </TouchableOpacity>
                </View>
                {s.bffStatus !== 'idle' && (
                  <Text style={s.bffStatus === 'ok' ? styles.msgOk : styles.msgError}>
                    {s.bffStatus === 'ok' ? `✓ ${t.setupBffConnectionOk}: ${s.bffMessage}` : `✗ ${s.bffMessage}`}
                  </Text>
                )}
              </>
            )}
          </>
        )}

        {/* ── onboarding CTA ── */}
        {isSetup && canFinishSetup && (
          <TouchableOpacity style={styles.goBtn} onPress={onComplete}>
            <Text style={styles.goTxt}>{t.setupGoToLibrary}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ── context menu ──
function ContextMenu({
  menu,
  t,
  onClose,
  onEdit,
  onDelete,
}: {
  menu: MenuState | null;
  t: ReturnType<typeof useStrings>;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal transparent visible={menu !== null} onRequestClose={onClose}>
      <TouchableOpacity style={styles.menuOverlay} onPress={onClose} activeOpacity={1}>
        <View style={styles.menuBox}>
          <TouchableOpacity style={styles.menuItem} onPress={onEdit}>
            <Text style={styles.menuItemTxt}>{t.serverListEdit}</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={onDelete}>
            <Text style={[styles.menuItemTxt, styles.menuItemDanger]}>{t.serverListDelete}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
