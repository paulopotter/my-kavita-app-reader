import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageContext } from './shared/i18n/LanguageContext';
import { getStrings } from './shared/i18n/strings';
import { ConfigRepository } from './shared/bridge/config';
import { StartupBridge } from './shared/bridge/startup';
import { AppShellStateProvider } from './shared/components/AppShellState';
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

  const navRef = useRef<NavigationContainerRef<any>>(null);

  const applyLanguage = useCallback((lang: string) => setLanguageState(lang), []);

  useEffect(() => {
    async function boot() {
      let prefs = null;
      try { prefs = await ConfigRepository.getUiPreferences(); } catch {}
      const lang = (prefs as any)?.language ?? detectSystemLanguage();
      applyLanguage(lang);

      // Restored-route boot (reopen on the last screen after the app was killed) — deferred.
      // The idea (to revisit): resolve `getRestoredRoute()` here and pass a dynamic
      // `initialRoute` to RootNavigator instead of the splash, so a deep session state doesn't
      // flash the splash first. Left out until the trade-offs (vs. letting the splash always run
      // and navigate) are worked through.
      //   let restoredRoute: string | null = null;
      //   try { restoredRoute = await StartupBridge.getRestoredRoute(); } catch {}
      //   if (restoredRoute && (await StartupBridge.hasServerConfigured().catch(() => false))) {
      //     setInitialRoute(mapRestored(restoredRoute));
      //   }
    }
    boot().catch(() => { /* splash runs and decides */ });
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
              onSetupComplete={() => {
                navRef.current?.reset({ index: 0, routes: [{ name: Routes.HUB }] });
              }}
            />
          </NavigationContainer>
        </AppShellStateProvider>
      </View>
    </LanguageContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1A1A2E' },
});
