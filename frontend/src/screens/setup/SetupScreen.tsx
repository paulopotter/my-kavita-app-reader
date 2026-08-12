import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ConfigRepository, ServerConfig, SetupBridge } from '../../shared/bridge/config';
import { useLanguage, useStrings } from '../../shared/i18n/useStrings';
import { extractKavitaApiKey } from '../../shared/transforms/kavitaApiKey';
import { addBffServer, savePreferences, saveServer } from '../config/ConfigService';

const BG = '#1A1A2E';
const CARD = '#16213E';
const DEEP = '#0F3460';
const RED = '#E94560';
const GREEN = '#38A169';
const MUTED = '#A0AEC0';

const LANGUAGES = [
  { code: 'pt-BR', label: '🇧🇷 PT' },
  { code: 'en',   label: '🇺🇸 EN' },
];

type ConnStatus = 'idle' | 'testing' | 'ok' | 'error';
type AuthStatus = 'idle' | 'loading' | 'ok' | 'error';

interface KavitaServer { id: string; url: string; priority: number }
interface BffServer { id: string; url: string; path: string; linkedKavitaId?: string }

interface MenuState { type: 'kavita' | 'bff'; id: string }

function isValidUrl(s: string): boolean {
  return /^https?:\/\/.+/.test(s.trim());
}

interface Props { onComplete: () => void }

export function SetupScreen({ onComplete }: Props) {
  const t = useStrings();
  const { language, setLanguage } = useLanguage();
  const statusBarHeight = 0;

  // ── Kavita servers ────────────────────────────────────────────────────────
  const [kavitaServers, setKavitaServers] = useState<KavitaServer[]>([]);
  const [kavitaUrlInput, setKavitaUrlInput] = useState('');
  const [kavitaUrlError, setKavitaUrlError] = useState('');
  const [editingKavita, setEditingKavita] = useState<KavitaServer | null>(null);
  const [connStatus, setConnStatus] = useState<ConnStatus>('idle');
  const [connMessage, setConnMessage] = useState('');
  const [activeKavitaUrl, setActiveKavitaUrl] = useState('');

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [apiKey, setApiKey] = useState('');
  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle');
  const [authMessage, setAuthMessage] = useState('');

  // ── BFF servers ───────────────────────────────────────────────────────────
  const [bffServers, setBffServers] = useState<BffServer[]>([]);
  const [bffUrlInput, setBffUrlInput] = useState('');
  const [bffPathInput, setBffPathInput] = useState('/manga');
  const [bffUrlError, setBffUrlError] = useState('');
  const [bffLinkedKavita, setBffLinkedKavita] = useState<string | undefined>();
  const [editingBff, setEditingBff] = useState<BffServer | null>(null);
  const [bffStatus, setBffStatus] = useState<ConnStatus>('idle');
  const [bffMessage, setBffMessage] = useState('');
  const [activeBffUrl, setActiveBffUrl] = useState('');

  // ── Context menu ──────────────────────────────────────────────────────────
  const [menu, setMenu] = useState<MenuState | null>(null);

  const isAuthenticated = authStatus === 'ok';

  // ── Language ──────────────────────────────────────────────────────────────
  const handleLanguageSelect = async (code: string) => {
    setLanguage(code);
    await savePreferences({ language: code });
  };

  // ── Kavita servers ────────────────────────────────────────────────────────
  const handleAddKavita = async () => {
    const url = kavitaUrlInput.trim();
    if (!isValidUrl(url)) {
      setKavitaUrlError('URL inválida (use http:// ou https://)');
      return;
    }
    setKavitaUrlError('');
    if (editingKavita) {
      const updated = { ...editingKavita, url };
      await saveServer({ ...updated, timeoutMs: 5000, healthCheckPath: '/api/Health' });
      setKavitaServers(prev => prev.map(s => s.id === editingKavita.id ? updated : s));
      setEditingKavita(null);
    } else {
      const id = `server-${Date.now()}`;
      const server: ServerConfig = { id, url, timeoutMs: 5000, priority: kavitaServers.length, healthCheckPath: '/api/Health' };
      await saveServer(server);
      setKavitaServers(prev => [...prev, { id, url, priority: prev.length }]);
    }
    setKavitaUrlInput('');
    setConnStatus('idle');
    setAuthStatus('idle');
  };

  const handleEditKavita = (s: KavitaServer) => {
    setMenu(null);
    setEditingKavita(s);
    setKavitaUrlInput(s.url);
  };

  const handleDeleteKavita = async (id: string) => {
    setMenu(null);
    await ConfigRepository.deleteServerConfig(id);
    setKavitaServers(prev => prev.filter(s => s.id !== id));
    setConnStatus('idle');
    setAuthStatus('idle');
    setActiveKavitaUrl('');
  };

  const handleTestConnection = async () => {
    setConnStatus('testing');
    setConnMessage('');
    try {
      const result = await SetupBridge.testKavitaConnection();
      setConnStatus('ok');
      setConnMessage(result.activeUrl);
      setActiveKavitaUrl(result.activeUrl);
    } catch (e: any) {
      setConnStatus('error');
      setConnMessage(e?.message ?? 'error');
      setActiveKavitaUrl('');
    }
  };

  // ── Auth ──────────────────────────────────────────────────────────────────
  const handleAuthenticate = async () => {
    const key = extractKavitaApiKey(apiKey);
    if (!key) return;
    setAuthStatus('loading');
    setAuthMessage('');
    try {
      await SetupBridge.authenticate(key);
      setAuthStatus('ok');
    } catch (e: any) {
      setAuthStatus('error');
      setAuthMessage(e?.message ?? 'error');
    }
  };

  // ── BFF servers ───────────────────────────────────────────────────────────
  const handleAddBff = async () => {
    const url = bffUrlInput.trim();
    if (!isValidUrl(url)) {
      setBffUrlError('URL inválida (use http:// ou https://)');
      return;
    }
    setBffUrlError('');
    const path = bffPathInput.trim() || '/manga';
    if (editingBff) {
      const updated: BffServer = { ...editingBff, url, path, linkedKavitaId: bffLinkedKavita };
      await ConfigRepository.deleteBffServerConfig(editingBff.id);
      await addBffServer(url, path, bffLinkedKavita);
      setBffServers(prev => prev.map(b => b.id === editingBff.id ? updated : b));
      setEditingBff(null);
    } else {
      const id = `bff-${Date.now()}`;
      await addBffServer(url, path, bffLinkedKavita);
      setBffServers(prev => [...prev, { id, url, path, linkedKavitaId: bffLinkedKavita }]);
    }
    setBffUrlInput('');
    setBffPathInput('/manga');
    setBffLinkedKavita(undefined);
    setBffStatus('idle');
  };

  const handleEditBff = (b: BffServer) => {
    setMenu(null);
    setEditingBff(b);
    setBffUrlInput(b.url);
    setBffPathInput(b.path);
    setBffLinkedKavita(b.linkedKavitaId);
  };

  const handleDeleteBff = async (id: string) => {
    setMenu(null);
    await ConfigRepository.deleteBffServerConfig(id);
    setBffServers(prev => prev.filter(b => b.id !== id));
    setBffStatus('idle');
    setActiveBffUrl('');
  };

  const handleTestBff = async () => {
    setBffStatus('testing');
    setBffMessage('');
    try {
      const result = await SetupBridge.testBffConnection();
      setBffStatus('ok');
      setBffMessage(result.activeUrl);
      setActiveBffUrl(result.activeUrl);
    } catch (e: any) {
      setBffStatus('error');
      setBffMessage(e?.message ?? 'error');
      setActiveBffUrl('');
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const cancelEdit = () => {
    setEditingKavita(null);
    setEditingBff(null);
    setKavitaUrlInput('');
    setBffUrlInput('');
    setBffPathInput('/manga');
    setBffLinkedKavita(undefined);
    setKavitaUrlError('');
    setBffUrlError('');
  };

  return (
    <View style={[styles.root, { paddingTop: statusBarHeight }]}>
      {/* StatusBar managed by App.tsx */}

      {/* Context menu modal */}
      <Modal transparent visible={menu !== null} onRequestClose={() => setMenu(null)}>
        <TouchableOpacity style={styles.menuOverlay} onPress={() => setMenu(null)} activeOpacity={1}>
          <View style={styles.menuBox}>
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              if (menu?.type === 'kavita') {
                const s = kavitaServers.find(x => x.id === menu.id);
                if (s) handleEditKavita(s);
              } else {
                const b = bffServers.find(x => x.id === menu?.id);
                if (b) handleEditBff(b);
              }
            }}>
              <Text style={styles.menuItemTxt}>{t.serverListEdit}</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => {
              if (menu?.type === 'kavita') handleDeleteKavita(menu.id);
              else if (menu?.type === 'bff') handleDeleteBff(menu!.id);
            }}>
              <Text style={[styles.menuItemTxt, styles.menuItemDanger]}>{t.serverListDelete}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t.setupTitle}</Text>
          <View style={styles.langRow}>
            {LANGUAGES.map(l => (
              <TouchableOpacity key={l.code}
                style={[styles.langBtn, language === l.code && styles.langBtnActive]}
                onPress={() => handleLanguageSelect(l.code)}>
                <Text style={[styles.langTxt, language === l.code && styles.langTxtActive]}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <Text style={styles.subtitle}>{t.setupSubtitle}</Text>

        {/* ── Kavita servers ────────────────────────────────────────────── */}
        <Text style={styles.section}>{t.configKavitaServers}</Text>

        {kavitaServers.map(s => {
          const isActive = s.url === activeKavitaUrl || s.url.replace(/\/$/, '') === activeKavitaUrl.replace(/\/$/, '');
          return (
            <View key={s.id} style={styles.serverRow}>
              <View style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />
              <Text style={styles.serverUrl} numberOfLines={1}>{s.url}</Text>
              <Text style={styles.priority}>P{s.priority}</Text>
              <TouchableOpacity onPress={() => setMenu({ type: 'kavita', id: s.id })} hitSlop={8}>
                <Text style={styles.menuDots}>⋯</Text>
              </TouchableOpacity>
            </View>
          );
        })}

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
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddKavita}>
              <Text style={styles.addBtnTxt}>{editingKavita ? '✓' : '+'}</Text>
            </TouchableOpacity>
            {editingKavita && (
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit}>
                <Text style={styles.cancelBtnTxt}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          {kavitaUrlError ? <Text style={styles.errorTxt}>{kavitaUrlError}</Text> : null}
        </View>

        {kavitaServers.length > 0 && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.outlineBtn, connStatus === 'testing' && styles.btnDisabled]}
              onPress={handleTestConnection} disabled={connStatus === 'testing'}>
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

        {/* ── Auth ─────────────────────────────────────────────────────── */}
        {kavitaServers.length > 0 && (
          <>
            <Text style={styles.section}>{t.configAuth}</Text>
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
                />
                <TouchableOpacity
                  style={[styles.addBtn, styles.addBtnPrimary, authStatus === 'loading' && styles.btnDisabled]}
                  onPress={handleAuthenticate}
                  disabled={authStatus === 'loading'}>
                  {authStatus === 'loading'
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Text style={styles.addBtnWhiteTxt}>→</Text>}
                </TouchableOpacity>
              </View>
            </View>
            {authStatus !== 'idle' && (
              <Text style={authStatus === 'ok' ? styles.msgOk : styles.msgError}>
                {authStatus === 'ok' ? `✓ ${t.setupAuthOk}` : `✗ ${authMessage}`}
              </Text>
            )}
          </>
        )}

        {/* ── BFF ──────────────────────────────────────────────────────── */}
        {kavitaServers.length > 0 && (
          <>
            <Text style={styles.section}>{t.setupBffSection}</Text>

            {bffServers.map(b => {
              const isActive = b.url === activeBffUrl || b.url.replace(/\/$/, '') === activeBffUrl.replace(/\/$/, '');
              const linked = kavitaServers.find(s => s.id === b.linkedKavitaId);
              return (
                <View key={b.id} style={styles.serverRow}>
                  <View style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serverUrl} numberOfLines={1}>{b.url}{b.path}</Text>
                    {linked && <Text style={styles.linkedLabel}>↳ {linked.url}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => setMenu({ type: 'bff', id: b.id })} hitSlop={8}>
                    <Text style={styles.menuDots}>⋯</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

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
              />
              {bffUrlError ? <Text style={styles.errorTxt}>{bffUrlError}</Text> : null}

              <Text style={styles.inputLabel}>{t.bffPathLabel}</Text>
              <View style={styles.addRow}>
                <TextInput
                  style={styles.input}
                  value={bffPathInput}
                  onChangeText={setBffPathInput}
                  placeholder="/manga"
                  placeholderTextColor="#4A5568"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.addBtn} onPress={handleAddBff}>
                  <Text style={styles.addBtnTxt}>{editingBff ? '✓' : '+'}</Text>
                </TouchableOpacity>
                {editingBff && (
                  <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit}>
                    <Text style={styles.cancelBtnTxt}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {kavitaServers.length > 0 && (
                <>
                  <Text style={styles.inputLabel}>{t.bffLinkKavitaLabel}</Text>
                  <View style={styles.linkOptions}>
                    <TouchableOpacity
                      style={[styles.linkChip, !bffLinkedKavita && styles.linkChipActive]}
                      onPress={() => setBffLinkedKavita(undefined)}>
                      <Text style={[styles.linkChipTxt, !bffLinkedKavita && styles.linkChipTxtActive]}>{t.bffLinkKavitaNone}</Text>
                    </TouchableOpacity>
                    {kavitaServers.map(s => (
                      <TouchableOpacity key={s.id}
                        style={[styles.linkChip, bffLinkedKavita === s.id && styles.linkChipActive]}
                        onPress={() => setBffLinkedKavita(s.id)}>
                        <Text style={[styles.linkChipTxt, bffLinkedKavita === s.id && styles.linkChipTxtActive]} numberOfLines={1}>
                          {s.url}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>

            {bffServers.length > 0 && (
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.outlineBtn, bffStatus === 'testing' && styles.btnDisabled]}
                  onPress={handleTestBff} disabled={bffStatus === 'testing'}>
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

        {/* ── Ir para a biblioteca ─────────────────────────────────────── */}
        {isAuthenticated && (
          <TouchableOpacity style={styles.goBtn} onPress={onComplete}>
            <Text style={styles.goTxt}>{t.setupGoToLibrary}</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { padding: 20, paddingBottom: 48 },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '700', color: '#FFFFFF' },
  langRow: { flexDirection: 'row', gap: 6 },
  langBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: DEEP, backgroundColor: CARD },
  langBtnActive: { borderColor: RED, backgroundColor: RED },
  langTxt: { color: MUTED, fontWeight: '600', fontSize: 12 },
  langTxtActive: { color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: MUTED, marginBottom: 20, lineHeight: 20 },

  section: { fontSize: 11, fontWeight: '700', color: '#8892b0', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 24, marginBottom: 10 },
  inputLabel: { fontSize: 12, color: MUTED, marginBottom: 4, marginTop: 10 },
  editLabel: { fontSize: 11, color: RED, marginBottom: 6 },

  serverRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  dotActive: { backgroundColor: GREEN },
  dotInactive: { backgroundColor: '#4A5568' },
  serverUrl: { flex: 1, color: '#FFFFFF', fontSize: 13 },
  priority: { color: MUTED, fontSize: 11 },
  linkedLabel: { color: MUTED, fontSize: 11, marginTop: 2 },
  menuDots: { color: MUTED, fontSize: 20, paddingHorizontal: 4 },

  formCard: { backgroundColor: CARD, borderRadius: 10, padding: 12, marginBottom: 4 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, backgroundColor: DEEP, color: '#FFFFFF', borderRadius: 8, padding: 11, fontSize: 13 },
  inputFull: { backgroundColor: DEEP, color: '#FFFFFF', borderRadius: 8, padding: 11, fontSize: 13 },
  inputError: { borderWidth: 1, borderColor: RED },
  errorTxt: { color: RED, fontSize: 11, marginTop: 4 },
  addBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: DEEP, borderWidth: 1, borderColor: RED, alignItems: 'center', justifyContent: 'center' },
  addBtnPrimary: { backgroundColor: RED, borderColor: RED },
  addBtnTxt: { color: RED, fontSize: 20, fontWeight: '700', lineHeight: 24 },
  addBtnWhiteTxt: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  cancelBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: DEEP, borderWidth: 1, borderColor: '#4A5568', alignItems: 'center', justifyContent: 'center' },
  cancelBtnTxt: { color: MUTED, fontSize: 16, fontWeight: '700' },

  linkOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  linkChip: { backgroundColor: DEEP, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 180 },
  linkChipActive: { backgroundColor: RED },
  linkChipTxt: { color: MUTED, fontSize: 12 },
  linkChipTxtActive: { color: '#FFFFFF' },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  outlineBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: RED },
  outlineTxt: { color: RED, fontSize: 13, fontWeight: '600' },
  btnDisabled: { opacity: 0.45 },

  msgOk: { color: '#68D391', fontSize: 12, marginTop: 6 },
  msgError: { color: '#FC8181', fontSize: 12, marginTop: 6 },

  goBtn: { marginTop: 32, backgroundColor: RED, borderRadius: 10, padding: 16, alignItems: 'center' },
  goTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  menuBox: { backgroundColor: CARD, borderRadius: 12, width: 200, overflow: 'hidden' },
  menuItem: { padding: 16, alignItems: 'center' },
  menuItemTxt: { color: '#FFFFFF', fontSize: 15 },
  menuItemDanger: { color: '#FC8181' },
  menuDivider: { height: 1, backgroundColor: DEEP },
});
