import React, { useState } from 'react';
import {
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  View,
  StatusBar,
} from 'react-native';
import { ServerConfig } from '../../shared/bridge/config';
import { AppVersions } from '../../shared/components/AppVersions';
import { useConfig } from './useConfig';
import { ServerList } from './components/ServerList';
import { ServerForm } from './components/ServerForm';
import { ApiKeyForm } from './components/ApiKeyForm';
import { PreferencesSection } from './components/PreferencesSection';
import { StatusBadge } from './components/StatusBadge';

const BG = '#1A1A2E';

export function ConfigScreen() {
  const { loading, servers, auth, prefs, error, saveServer, deleteServer, saveApiKey, savePreferences } = useConfig();
  const [editingServer, setEditingServer] = useState<ServerConfig | 'new' | null>(null);
  const statusBarHeight = StatusBar.currentHeight ?? 0;

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: statusBarHeight }]}>
        <StatusBar backgroundColor={BG} barStyle="light-content" />
        <ActivityIndicator size="large" color="#E94560" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: statusBarHeight }]}>
      <StatusBar backgroundColor={BG} barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Configurações</Text>

        {error && <StatusBadge ok={false} label="Erro ao carregar" detail={error} />}

        {/* ── Servidores ────────────────────────────────────────────── */}
        <Text style={styles.section}>Servidores Kavita</Text>
        <ServerList
          servers={servers}
          onEdit={s => setEditingServer(s)}
          onDelete={id => deleteServer(id)}
        />
        {editingServer !== null ? (
          <ServerForm
            initial={editingServer === 'new' ? undefined : editingServer}
            onSave={async s => { await saveServer(s); setEditingServer(null); }}
            onCancel={() => setEditingServer(null)}
          />
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={() => setEditingServer('new')}>
            <Text style={styles.addTxt}>+ Adicionar servidor</Text>
          </TouchableOpacity>
        )}

        {/* ── Auth ─────────────────────────────────────────────────── */}
        <Text style={styles.section}>Autenticação</Text>
        <StatusBadge
          ok={!!auth?.apiKey}
          label={auth?.apiKey ? 'API Key configurada' : 'Sem API Key'}
        />
        <ApiKeyForm
          currentApiKey={auth?.apiKey}
          onSave={async k => { await saveApiKey(k); }}
        />

        {/* ── Preferências ─────────────────────────────────────────── */}
        <Text style={styles.section}>Preferências</Text>
        {prefs && (
          <PreferencesSection
            prefs={prefs}
            onChange={update => savePreferences(update)}
          />
        )}
      </ScrollView>
      <AppVersions />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16, color: '#FFFFFF' },
  section: { fontSize: 13, fontWeight: '600', color: '#8892b0', textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 6 },
  addBtn: { marginTop: 8, padding: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#E94560', borderRadius: 8, alignItems: 'center' },
  addTxt: { color: '#E94560', fontWeight: '600' },
});
