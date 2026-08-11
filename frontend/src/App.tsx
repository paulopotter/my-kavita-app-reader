import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { ConfigRepository } from './shared/bridge/config';
import { LanguageContext } from './shared/i18n/LanguageContext';
import { getStrings } from './shared/i18n/strings';
import { BottomBar, Tab } from './shared/components/BottomBar';
import { LibraryScreen } from './screens/library/LibraryScreen';
import { ConfigScreen } from './screens/config/ConfigScreen';
import { SetupScreen } from './screens/setup/SetupScreen';

type AppState = 'loading' | 'setup' | 'main';

function detectSystemLanguage(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    if (locale.startsWith('pt')) return 'pt-BR';
    return 'en';
  } catch {
    return 'en';
  }
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [activeTab, setActiveTab] = useState<Tab>('library');
  const [language, setLanguageState] = useState('pt-BR');

  // Exposed to ConfigScreen so it can intercept Android back while in a sub-screen
  const configBackHandlerRef = useRef<(() => boolean) | null>(null);

  const applyLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
  }, []);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [servers, prefs] = await Promise.all([
          ConfigRepository.getServerConfigs(),
          ConfigRepository.getUiPreferences(),
        ]);
        const lang = prefs?.language ?? detectSystemLanguage();
        applyLanguage(lang);
        setAppState(servers?.length ? 'main' : 'setup');
      } catch {
        applyLanguage(detectSystemLanguage());
        setAppState('setup');
      }
    }
    bootstrap();
  }, [applyLanguage]);

  // Android hardware back button
  useEffect(() => {
    if (appState !== 'main') return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      // If ConfigScreen has a sub-screen open, let it handle back first
      if (configBackHandlerRef.current?.()) return true;
      // On library tab (root) → ask to exit
      if (activeTab === 'library') {
        Alert.alert(
          getStrings(language).exitTitle,
          getStrings(language).exitMessage,
          [
            { text: getStrings(language).exitCancel, style: 'cancel' },
            { text: getStrings(language).exitConfirm, onPress: () => BackHandler.exitApp() },
          ],
        );
        return true;
      }
      // On settings tab → go back to library
      setActiveTab('library');
      return true;
    });
    return () => handler.remove();
  }, [appState, activeTab, language]);

  if (appState === 'loading') {
    return <View style={styles.root} />;
  }

  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

  return (
    <LanguageContext.Provider value={{ language, strings: getStrings(language), setLanguage: applyLanguage }}>
      <StatusBar backgroundColor="#1A1A2E" barStyle="light-content" translucent={false} />
      <View style={[styles.root, { paddingTop: statusBarHeight }]}>
        {appState === 'setup' ? (
          <SetupScreen onComplete={() => setAppState('main')} />
        ) : (
          <>
            <View style={styles.content}>
              {activeTab === 'library'
                ? <LibraryScreen />
                : <ConfigScreen onRegisterBackHandler={fn => { configBackHandlerRef.current = fn; }} />
              }
            </View>
            <BottomBar activeTab={activeTab} onTabPress={setActiveTab} />
          </>
        )}
      </View>
    </LanguageContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1A1A2E' },
  content: { flex: 1 },
});
