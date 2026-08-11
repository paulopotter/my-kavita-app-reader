import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ConfigRepository, SetupBridge } from '../../shared/bridge/config';
import { AppVersions } from '../../shared/components/AppVersions';
import { useLanguage, useStrings } from '../../shared/i18n/useStrings';
import { addBffServer, savePreferences, saveServer } from './ConfigService';
import { useConfig } from './useConfig';

const BG = '#1A1A2E';
const CARD = '#16213E';
const DEEP = '#0F3460';
const RED = '#E94560';
const GREEN = '#38A169';
const MUTED = '#A0AEC0';

type Screen = 'menu' | 'server' | 'reading';
type ConnStatus = 'idle' | 'testing' | 'ok' | 'error';
type AuthStatus = 'idle' | 'loading' | 'ok' | 'error';
interface MenuState { type: 'kavita' | 'bff' | 'apikey'; id: string }

function isValidUrl(s: string): boolean {
  return /^https?:\/\/.+/.test(s.trim());
}

function maskApiKey(key: string): string {
  if (key.length <= 6) return '*'.repeat(key.length);
  return key.slice(0, 6) + '*'.repeat(Math.max(1, key.length - 8)) + key.slice(-2);
}

// ─── Root with internal nav ───────────────────────────────────────────────────

interface ConfigScreenProps {
  onRegisterBackHandler?: (fn: (() => boolean) | null) => void;
}

export function ConfigScreen({ onRegisterBackHandler }: ConfigScreenProps) {
  const [screen, setScreen] = useState<Screen>('menu');

  const goBack = () => setScreen('menu');

  useEffect(() => {
    if (!onRegisterBackHandler) return;
    if (screen !== 'menu') {
      onRegisterBackHandler(() => { goBack(); return true; });
    } else {
      onRegisterBackHandler(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  switch (screen) {
    case 'server':
      return <ServerScreen onBack={goBack} />;
    case 'reading':
      return <ReadingPrefsScreen onBack={goBack} />;
    default:
      return <ConfigMenuScreen onNavigate={setScreen} />;
  }
}

// ─── Menu principal ────────────────────────────────────────────────────────────

function ConfigMenuScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const t = useStrings();
  const { language, setLanguage } = useLanguage();

  const handleLanguageToggle = async () => {
    const next = language === 'en' ? 'pt-BR' : 'en';
    setLanguage(next);
    savePreferences({ language: next }).catch(() => {});
  };

  return (
    <View style={styles.root}>
      <Text style={styles.pageTitle}>{t.configTitle}</Text>
      <TouchableOpacity style={styles.menuRow} onPress={() => onNavigate('server')}>
        <Text style={styles.menuRowLabel}>{t.configMenuServer}</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>
      <View style={styles.divider} />
      <TouchableOpacity style={styles.menuRow} onPress={() => onNavigate('reading')}>
        <Text style={styles.menuRowLabel}>{t.configMenuReading}</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>
      <View style={styles.divider} />
      <View style={styles.menuFooter}>
        <View style={styles.langSwitchRow}>
          <TouchableOpacity
            style={[styles.langOption, language === 'pt-BR' && styles.langOptionActive]}
            onPress={() => language !== 'pt-BR' && handleLanguageToggle()}>
            <Text style={[styles.langOptionTxt, language === 'pt-BR' && styles.langOptionTxtActive]}>🇧🇷 PT</Text>
          </TouchableOpacity>
          <View style={styles.langTrack}>
            <View style={[styles.langThumb, language === 'en' && styles.langThumbRight]} />
          </View>
          <TouchableOpacity
            style={[styles.langOption, language === 'en' && styles.langOptionActive]}
            onPress={() => language !== 'en' && handleLanguageToggle()}>
            <Text style={[styles.langOptionTxt, language === 'en' && styles.langOptionTxtActive]}>🇺🇸 EN</Text>
          </TouchableOpacity>
        </View>
        <AppVersions t={t} />
      </View>
    </View>
  );
}

// ─── Servidor ─────────────────────────────────────────────────────────────────

function ServerScreen({ onBack }: { onBack: () => void }) {
  const t = useStrings();
  const { servers, auth, bffServers, reload } = useConfig();

  // ── Kavita ────────────────────────────────────────────────────────────────
  const [showKavitaForm, setShowKavitaForm] = useState(false);
  const [kavitaUrlInput, setKavitaUrlInput] = useState('');
  const [kavitaUrlError, setKavitaUrlError] = useState('');
  const [editingKavitaId, setEditingKavitaId] = useState<string | null>(null);
  const [connStatus, setConnStatus] = useState<ConnStatus>('idle');
  const [connMessage, setConnMessage] = useState('');
  const [activeKavitaUrl, setActiveKavitaUrl] = useState('');

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle');
  const [authMessage, setAuthMessage] = useState('');

  // ── BFF ───────────────────────────────────────────────────────────────────
  const [showBffForm, setShowBffForm] = useState(false);
  const [bffUrlInput, setBffUrlInput] = useState('');
  const [bffPathInput, setBffPathInput] = useState('/manga');
  const [bffUrlError, setBffUrlError] = useState('');
  const [bffLinkedKavita, setBffLinkedKavita] = useState<string | undefined>();
  const [editingBffId, setEditingBffId] = useState<string | null>(null);
  const [bffStatus, setBffStatus] = useState<ConnStatus>('idle');
  const [bffMessage, setBffMessage] = useState('');
  const [activeBffUrl, setActiveBffUrl] = useState('');

  // ── Context menu ──────────────────────────────────────────────────────────
  const [menu, setMenu] = useState<MenuState | null>(null);

  const editingKavita = editingKavitaId ? servers.find(s => s.id === editingKavitaId) ?? null : null;
  const editingBff = editingBffId ? bffServers.find(b => b.id === editingBffId) ?? null : null;
  const hasApiKey = !!auth?.apiKey;

  // Load last known active URLs from Kotlin cache on mount
  const didLoadKnown = useRef(false);
  useEffect(() => {
    if (didLoadKnown.current) return;
    didLoadKnown.current = true;
    SetupBridge.getLastKnownUrls().then(known => {
      if (known.kavitaUrl) setActiveKavitaUrl(known.kavitaUrl);
      if (known.bffUrl) setActiveBffUrl(known.bffUrl);
    }).catch(() => {});
  }, []);

  // ── Handlers Kavita ───────────────────────────────────────────────────────
  const handleSaveKavita = async () => {
    const url = kavitaUrlInput.trim();
    if (!isValidUrl(url)) { setKavitaUrlError('URL inválida (use http:// ou https://)'); return; }
    setKavitaUrlError('');
    if (editingKavita) {
      await saveServer({ ...editingKavita, url });
      setEditingKavitaId(null);
    } else {
      const id = `server-${Date.now()}`;
      await saveServer({ id, url, timeoutMs: 5000, priority: servers.length, healthCheckPath: '/api/Health' });
    }
    setKavitaUrlInput('');
    setShowKavitaForm(false);
    await reload();
  };

  const handleDeleteKavita = async (id: string) => {
    setMenu(null);
    await ConfigRepository.deleteServerConfig(id);
    await reload();
    setConnStatus('idle'); setActiveKavitaUrl('');
  };

  const handleEditKavita = (id: string) => {
    setMenu(null);
    const s = servers.find(x => x.id === id);
    if (s) { setEditingKavitaId(id); setKavitaUrlInput(s.url); setShowKavitaForm(true); }
  };

  const handleTestConnection = async () => {
    setConnStatus('testing'); setConnMessage('');
    try {
      const result = await SetupBridge.testKavitaConnection();
      setConnStatus('ok'); setConnMessage(result.activeUrl); setActiveKavitaUrl(result.activeUrl);
    } catch (e: any) {
      setConnStatus('error'); setConnMessage(e?.message ?? 'error'); setActiveKavitaUrl('');
    }
  };

  // ── Handlers Auth ─────────────────────────────────────────────────────────
  const handleAuthenticate = async () => {
    const key = apiKey.trim();
    if (!key) return;
    setAuthStatus('loading'); setAuthMessage('');
    try {
      await SetupBridge.authenticate(key);
      setAuthStatus('ok');
      setShowApiKeyForm(false);
      setApiKey('');
      await reload();
    } catch (e: any) {
      setAuthStatus('error'); setAuthMessage(e?.message ?? 'error');
    }
  };

  const handleDeleteApiKey = async () => {
    setMenu(null);
    await ConfigRepository.upsertAuthConfig({ apiKey: '' });
    setAuthStatus('idle');
    await reload();
  };

  // ── Handlers BFF ──────────────────────────────────────────────────────────
  const handleSaveBff = async () => {
    const url = bffUrlInput.trim();
    if (!isValidUrl(url)) { setBffUrlError('URL inválida (use http:// ou https://)'); return; }
    setBffUrlError('');
    const path = bffPathInput.trim() || '/manga';
    if (editingBff) {
      await ConfigRepository.deleteBffServerConfig(editingBff.id);
      setEditingBffId(null);
    }
    await addBffServer(url, path, bffLinkedKavita);
    setBffUrlInput(''); setBffPathInput('/manga'); setBffLinkedKavita(undefined);
    setShowBffForm(false);
    await reload();
  };

  const handleDeleteBff = async (id: string) => {
    setMenu(null);
    await ConfigRepository.deleteBffServerConfig(id);
    await reload();
    setBffStatus('idle'); setActiveBffUrl('');
  };

  const handleEditBff = (id: string) => {
    setMenu(null);
    const b = bffServers.find(x => x.id === id);
    if (b) {
      setEditingBffId(id);
      setBffUrlInput(b.url);
      setBffPathInput(b.healthCheckPath || '/manga');
      setBffLinkedKavita(b.linkedKavitaServerConfigId);
      setShowBffForm(true);
    }
  };

  const handleTestBff = async () => {
    setBffStatus('testing'); setBffMessage('');
    try {
      const result = await SetupBridge.testBffConnection();
      setBffStatus('ok'); setBffMessage(result.activeUrl); setActiveBffUrl(result.activeUrl);
    } catch (e: any) {
      setBffStatus('error'); setBffMessage(e?.message ?? 'error'); setActiveBffUrl('');
    }
  };

  const cancelKavitaForm = () => {
    setShowKavitaForm(false); setEditingKavitaId(null);
    setKavitaUrlInput(''); setKavitaUrlError('');
  };

  const cancelBffForm = () => {
    setShowBffForm(false); setEditingBffId(null);
    setBffUrlInput(''); setBffPathInput('/manga'); setBffLinkedKavita(undefined); setBffUrlError('');
  };

  return (
    <View style={styles.root}>
      <Modal transparent visible={menu !== null} onRequestClose={() => setMenu(null)}>
        <TouchableOpacity style={styles.menuOverlay} onPress={() => setMenu(null)} activeOpacity={1}>
          <View style={styles.menuBox}>
            {menu?.type !== 'apikey' && (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => {
                  if (menu?.type === 'kavita') handleEditKavita(menu.id);
                  else if (menu?.type === 'bff') handleEditBff(menu.id);
                }}>
                  <Text style={styles.menuItemTxt}>{t.serverListEdit}</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
              </>
            )}
            {menu?.type === 'apikey' && (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setMenu(null); setShowApiKeyForm(true); }}>
                  <Text style={styles.menuItemTxt}>{t.serverListEdit}</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
              </>
            )}
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              if (menu?.type === 'kavita') handleDeleteKavita(menu.id);
              else if (menu?.type === 'bff') handleDeleteBff(menu!.id);
              else if (menu?.type === 'apikey') handleDeleteApiKey();
            }}>
              <Text style={[styles.menuItemTxt, styles.menuItemDanger]}>{t.serverListDelete}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.subHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtnArea} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>{t.configMenuServer}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Kavita ────────────────────────────────────────────────────── */}
        <Text style={styles.section}>{t.configKavitaServers}</Text>

        {servers.map(s => {
          const isActive = activeKavitaUrl !== '' && (
            s.url === activeKavitaUrl ||
            s.url.replace(/\/$/, '') === activeKavitaUrl.replace(/\/$/, '')
          );
          return (
            <View key={s.id} style={styles.serverRow}>
              <View style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />
              <Text style={styles.serverUrl} numberOfLines={1}>{s.url}</Text>
              <TouchableOpacity onPress={() => setMenu({ type: 'kavita', id: s.id })} hitSlop={8}>
                <Text style={styles.menuDots}>⋯</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {showKavitaForm ? (
          <View style={styles.formCard}>
            {editingKavita && <Text style={styles.editLabel}>Editando: {editingKavita.url}</Text>}
            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, kavitaUrlError ? styles.inputError : null]}
                value={kavitaUrlInput}
                onChangeText={v => { setKavitaUrlInput(v); setKavitaUrlError(''); }}
                placeholder={t.serverFormUrlPlaceholder}
                placeholderTextColor="#4A5568"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              <TouchableOpacity style={styles.addBtn} onPress={handleSaveKavita}>
                <Text style={styles.addBtnTxt}>✓</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelKavitaForm}>
                <Text style={styles.cancelBtnTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            {kavitaUrlError ? <Text style={styles.errorTxt}>{kavitaUrlError}</Text> : null}
          </View>
        ) : (
          <TouchableOpacity style={styles.addDashedBtn} onPress={() => setShowKavitaForm(true)}>
            <Text style={styles.addDashedTxt}>{t.configAddServer}</Text>
          </TouchableOpacity>
        )}

        {servers.length > 0 && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.outlineBtn, connStatus === 'testing' && styles.btnDisabled]}
              onPress={handleTestConnection}
              disabled={connStatus === 'testing'}>
              <Text style={styles.outlineTxt}>
                {connStatus === 'testing' ? t.setupTesting : t.setupTestConnection}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {connStatus !== 'idle' && (
          <Text style={connStatus === 'ok' ? styles.msgOk : styles.msgError}>
            {connStatus === 'ok' ? `✓ ${t.setupConnectionOk}: ${connMessage}` : `✗ ${connMessage}`}
          </Text>
        )}

        {/* ── Auth ──────────────────────────────────────────────────────── */}
        {servers.length > 0 && (
          <>
            <Text style={styles.section}>{t.configAuth}</Text>

            {hasApiKey && !showApiKeyForm && (
              <View style={styles.serverRow}>
                <View style={[styles.dot, styles.dotActive]} />
                <Text style={styles.serverUrl}>{maskApiKey(auth!.apiKey)}</Text>
                <TouchableOpacity onPress={() => setMenu({ type: 'apikey', id: 'apikey' })} hitSlop={8}>
                  <Text style={styles.menuDots}>⋯</Text>
                </TouchableOpacity>
              </View>
            )}

            {showApiKeyForm ? (
              <View style={styles.formCard}>
                <Text style={styles.inputLabel}>{t.setupApiKeyLabel}</Text>
                <View style={styles.addRow}>
                  <TextInput
                    style={styles.input}
                    value={apiKey}
                    onChangeText={setApiKey}
                    placeholder={t.apiKeyPlaceholder}
                    placeholderTextColor="#4A5568"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.addBtn, styles.addBtnPrimary, authStatus === 'loading' && styles.btnDisabled]}
                    onPress={handleAuthenticate}
                    disabled={authStatus === 'loading'}>
                    {authStatus === 'loading'
                      ? <ActivityIndicator size="small" color="#FFF" />
                      : <Text style={styles.addBtnWhiteTxt}>→</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowApiKeyForm(false); setApiKey(''); setAuthStatus('idle'); }}>
                    <Text style={styles.cancelBtnTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
                {authStatus === 'error' && <Text style={styles.errorTxt}>✗ {authMessage}</Text>}
              </View>
            ) : !hasApiKey ? (
              <TouchableOpacity style={styles.addDashedBtn} onPress={() => setShowApiKeyForm(true)}>
                <Text style={styles.addDashedTxt}>+ {t.setupApiKeyLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}

        {/* ── BFF ───────────────────────────────────────────────────────── */}
        {servers.length > 0 && (
          <>
            <Text style={styles.section}>{t.setupBffSection}</Text>

            {bffServers.map(b => {
              const isActive = activeBffUrl !== '' && (
                b.url === activeBffUrl ||
                b.url.replace(/\/$/, '') === activeBffUrl.replace(/\/$/, '')
              );
              const linked = servers.find(s => s.id === b.linkedKavitaServerConfigId);
              return (
                <View key={b.id} style={styles.serverRow}>
                  <View style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serverUrl} numberOfLines={1}>{b.url}{b.healthCheckPath}</Text>
                    <Text style={linked ? styles.linkedLabel : styles.linkedLabelNone} numberOfLines={1}>
                      {linked ? `↳ ${linked.url}` : t.bffLinkedTo + ': —'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setMenu({ type: 'bff', id: b.id })} hitSlop={8}>
                    <Text style={styles.menuDots}>⋯</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            {showBffForm ? (
              <View style={styles.formCard}>
                {editingBff && <Text style={styles.editLabel}>Editando: {editingBff.url}</Text>}
                <Text style={styles.inputLabel}>{t.bffUrlLabel}</Text>
                <TextInput
                  style={[styles.inputFull, bffUrlError ? styles.inputError : null]}
                  value={bffUrlInput}
                  onChangeText={v => { setBffUrlInput(v); setBffUrlError(''); }}
                  placeholder={t.bffUrlPlaceholder}
                  placeholderTextColor="#4A5568"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
                {bffUrlError ? <Text style={styles.errorTxt}>{bffUrlError}</Text> : null}

                <Text style={styles.inputLabel}>{t.bffPathLabel}</Text>
                <TextInput
                  style={styles.inputFull}
                  value={bffPathInput}
                  onChangeText={setBffPathInput}
                  placeholder="/manga"
                  placeholderTextColor="#4A5568"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.inputLabel}>{t.bffLinkKavitaLabel}</Text>
                <View style={styles.linkOptions}>
                  <TouchableOpacity
                    style={[styles.linkChip, !bffLinkedKavita && styles.linkChipActive]}
                    onPress={() => setBffLinkedKavita(undefined)}>
                    <Text style={[styles.linkChipTxt, !bffLinkedKavita && styles.linkChipTxtActive]}>{t.bffLinkKavitaNone}</Text>
                  </TouchableOpacity>
                  {servers.map(s => (
                    <TouchableOpacity key={s.id}
                      style={[styles.linkChip, bffLinkedKavita === s.id && styles.linkChipActive]}
                      onPress={() => setBffLinkedKavita(s.id)}>
                      <Text style={[styles.linkChipTxt, bffLinkedKavita === s.id && styles.linkChipTxtActive]} numberOfLines={1}>
                        {s.url}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={cancelBffForm}>
                    <Text style={styles.cancelBtnTxt}>✕</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.addBtn, styles.addBtnPrimary]} onPress={handleSaveBff}>
                    <Text style={styles.addBtnWhiteTxt}>✓</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.addDashedBtn} onPress={() => setShowBffForm(true)}>
                <Text style={styles.addDashedTxt}>{t.bffAddServer}</Text>
              </TouchableOpacity>
            )}

            {bffServers.length > 0 && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.outlineBtn, bffStatus === 'testing' && styles.btnDisabled]}
                  onPress={handleTestBff}
                  disabled={bffStatus === 'testing'}>
                  <Text style={styles.outlineTxt}>
                    {bffStatus === 'testing' ? t.setupTesting : t.setupBffTestConnection}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {bffStatus !== 'idle' && (
              <Text style={bffStatus === 'ok' ? styles.msgOk : styles.msgError}>
                {bffStatus === 'ok' ? `✓ ${t.setupBffConnectionOk}: ${bffMessage}` : `✗ ${bffMessage}`}
              </Text>
            )}
          </>
        )}

      </ScrollView>
    </View>
  );
}

// ─── Preferências de leitura ───────────────────────────────────────────────────

function ReadingPrefsScreen({ onBack }: { onBack: () => void }) {
  const t = useStrings();
  const { prefs, savePreferences: savePrefs } = useConfig();

  return (
    <View style={styles.root}>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtnArea} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>{t.configMenuReading}</Text>
      </View>

      <View style={styles.prefContainer}>
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>{t.configKeepScreenOn}</Text>
          <Switch
            value={prefs?.keepScreenOnDuringReading ?? false}
            onValueChange={v => savePrefs({ keepScreenOnDuringReading: v })}
            thumbColor={prefs?.keepScreenOnDuringReading ? RED : MUTED}
            trackColor={{ false: DEEP, true: '#7F1D1D' }}
          />
        </View>
        <View style={styles.divider} />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  pageTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', padding: 20, paddingBottom: 8 },

  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  menuRowLabel: { fontSize: 16, color: '#FFFFFF' },
  menuRowArrow: { fontSize: 22, color: MUTED },
  divider: { height: 1, backgroundColor: DEEP, marginHorizontal: 20 },

  subHeader: { flexDirection: 'row', alignItems: 'center', paddingLeft: 4, paddingRight: 16, paddingTop: 8, paddingBottom: 8, gap: 4 },
  backBtnArea: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  backChevron: { color: RED, fontSize: 32, fontWeight: '300', lineHeight: 40 },
  subTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#FFFFFF' },

  scroll: { padding: 16, paddingBottom: 48 },

  section: { fontSize: 11, fontWeight: '700', color: '#8892b0', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 20, marginBottom: 10 },
  inputLabel: { fontSize: 12, color: MUTED, marginBottom: 4, marginTop: 10 },
  editLabel: { fontSize: 11, color: RED, marginBottom: 6 },

  serverRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  dotActive: { backgroundColor: GREEN },
  dotInactive: { backgroundColor: '#4A5568' },
  serverUrl: { flex: 1, color: '#FFFFFF', fontSize: 13 },
  linkedLabel: { color: MUTED, fontSize: 11, marginTop: 2 },
  menuDots: { color: MUTED, fontSize: 20, paddingHorizontal: 4 },

  formCard: { backgroundColor: CARD, borderRadius: 10, padding: 12, marginBottom: 4 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  input: { flex: 1, backgroundColor: DEEP, color: '#FFFFFF', borderRadius: 8, padding: 11, fontSize: 13 },
  inputFull: { backgroundColor: DEEP, color: '#FFFFFF', borderRadius: 8, padding: 11, fontSize: 13, marginBottom: 4 },
  inputError: { borderWidth: 1, borderColor: RED },
  errorTxt: { color: RED, fontSize: 11, marginTop: 4 },
  addBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: DEEP, borderWidth: 1, borderColor: RED, alignItems: 'center', justifyContent: 'center' },
  addBtnPrimary: { backgroundColor: RED, borderColor: RED },
  addBtnTxt: { color: RED, fontSize: 20, fontWeight: '700', lineHeight: 24 },
  addBtnWhiteTxt: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  cancelBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: DEEP, borderWidth: 1, borderColor: '#4A5568', alignItems: 'center', justifyContent: 'center' },
  cancelBtnTxt: { color: MUTED, fontSize: 16, fontWeight: '700' },

  addDashedBtn: { marginTop: 6, padding: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: RED, borderRadius: 8, alignItems: 'center' },
  addDashedTxt: { color: RED, fontWeight: '600', fontSize: 13 },

  linkOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  linkChip: { backgroundColor: DEEP, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 180 },
  linkChipActive: { backgroundColor: RED },
  linkChipTxt: { color: MUTED, fontSize: 12 },
  linkChipTxtActive: { color: '#FFFFFF' },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  outlineBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: RED },
  outlineTxt: { color: RED, fontSize: 13, fontWeight: '600' },
  btnDisabled: { opacity: 0.45 },

  msgOk: { color: '#68D391', fontSize: 12, marginTop: 6 },
  msgError: { color: '#FC8181', fontSize: 12, marginTop: 6 },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  menuBox: { backgroundColor: CARD, borderRadius: 12, width: 200, overflow: 'hidden' },
  menuItem: { padding: 16, alignItems: 'center' },
  menuItemTxt: { color: '#FFFFFF', fontSize: 15 },
  menuItemDanger: { color: '#FC8181' },
  menuDivider: { height: 1, backgroundColor: DEEP },

  prefContainer: { padding: 16 },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  prefLabel: { flex: 1, color: '#FFFFFF', fontSize: 15, marginRight: 12 },

  menuFooter: { position: 'absolute', bottom: 0, left: 0, right: 0 },

  langSwitchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ffffff22',
  },
  langOption: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  langOptionActive: { backgroundColor: RED },
  langOptionTxt: { color: MUTED, fontSize: 13, fontWeight: '600' },
  langOptionTxtActive: { color: '#FFFFFF' },
  langTrack: {
    width: 40, height: 22, borderRadius: 11, backgroundColor: DEEP,
    borderWidth: 1, borderColor: '#4A5568',
    justifyContent: 'center', paddingHorizontal: 2,
  },
  langThumb: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: RED,
    alignSelf: 'flex-start',
  },
  langThumbRight: { alignSelf: 'flex-end' },

  linkedLabelNone: { color: '#4A5568', fontSize: 11, marginTop: 2, fontStyle: 'italic' },
});
