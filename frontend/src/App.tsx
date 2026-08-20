import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageContext } from './shared/i18n/LanguageContext';
import { getStrings } from './shared/i18n/strings';
import { ConfigRepository } from './shared/bridge/config';
import { StartupBridge } from './shared/bridge/startup';
import { AppShellStateProvider } from './shared/components/AppShellState';
import { SplashScreen } from './screens/splash/SplashScreen';
import { useSplash } from './screens/splash/useSplash';
import { RootNavigator } from './navigation/RootNavigator';
import { Routes, BOTTOM_NAV_ROUTES } from './navigation/routes';

function detectSystemLanguage(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    if (locale.startsWith('pt')) { return 'pt-BR'; }
    return 'en';
  } catch {
    return 'en';
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [language, setLanguageState] = useState('pt-BR');
  const [showSplash, setShowSplash] = useState(true);

  const navRef = useRef<NavigationContainerRef<any>>(null);

  const applyLanguage = useCallback((lang: string) => setLanguageState(lang), []);

  useEffect(() => {
    async function boot() {
      let prefs = null;
      try { prefs = await ConfigRepository.getUiPreferences(); } catch {}

      const lang = (prefs as any)?.language ?? detectSystemLanguage();
      applyLanguage(lang);

      let restoredRoute: string | null = null;
      try { restoredRoute = await StartupBridge.getRestoredRoute(); } catch {}

      if (restoredRoute) {
        const hasServer = await StartupBridge.hasServerConfigured().catch(() => false);
        if (!hasServer) {
          // Servidor removido — descarta rota restaurada, mostra setup via splash normal
          return;
        }
        setShowSplash(false);
        StartupBridge.syncInBackground().catch(() => {});
      }
    }
    boot().catch(() => { /* splash stays visible */ });
  }, [applyLanguage]);

  const onNavigationStateChange = useCallback(() => {
    const currentRoute = navRef.current?.getCurrentRoute();
    if (!currentRoute) { return; }
    const name = currentRoute.name;
    const isRoot = BOTTOM_NAV_ROUTES.has(name);
    StartupBridge.notifyRouteChanged(name, isRoot, isRoot ? name : undefined).catch(() => {});
  }, []);

  // useSafeAreaInsets reage a mudanças reais de inset (rotação, cutout dinâmico, densidade) —
  // diferente de StatusBar.currentHeight (lido uma única vez, síncrono, no primeiro render),
  // que podia vir desatualizado/0 se o layout nativo ainda não tivesse se estabilizado quando o
  // JS montou, deixando o conteúdo atrás da barra de notificação até o próximo reload do app.
  const insets = useSafeAreaInsets();
  const statusBarHeight = insets.top;

  return (
    <LanguageContext.Provider value={{ language, strings: getStrings(language), setLanguage: applyLanguage }}>
      <StatusBar backgroundColor="#1A1A2E" barStyle="light-content" translucent={false} />
      <View style={[styles.root, { paddingTop: statusBarHeight }]}>
        <AppShellStateProvider>
          <NavigationContainer ref={navRef} onStateChange={onNavigationStateChange}>
            <RootNavigator
              initialRoute="main"
              onSetupComplete={() => {
                navRef.current?.reset({ index: 0, routes: [{ name: 'main' }] });
              }}
            />
          </NavigationContainer>

          {showSplash && (
            <SplashOverlayWrapper
              onDone={(destination) => {
                setShowSplash(false);
                const target = destination === 'setup' ? Routes.SETUP : 'main';
                navRef.current?.reset({ index: 0, routes: [{ name: target }] });
              }}
            />
          )}
        </AppShellStateProvider>
      </View>
    </LanguageContext.Provider>
  );
}

function SplashOverlayWrapper({ onDone }: { onDone: (dest: 'setup' | 'library' | 'following') => void }) {
  const { progress, otaUpdateReady, destination, otaPolicy, onPolicyDismissed } = useSplash();
  const doneRef = useRef(false);

  useEffect(() => {
    if (destination && !doneRef.current) {
      doneRef.current = true;
      onDone(destination);
    }
  }, [destination, onDone]);

  return (
    <SplashScreen
      progress={progress}
      otaUpdateReady={otaUpdateReady}
      otaPolicy={otaPolicy}
      onPolicyDismissed={onPolicyDismissed}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1A1A2E' },
});
