import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageContext, getStrings } from './shared/i18n';
import { ConfigRepository, StartupBridge } from './shared/bridge';
import { StartupProvider } from './shared/context/startup';
import { registerSeriesDigestIndexListener } from './shared/managers/store';
import { RootNavigator } from './navigation/RootNavigator';
import { Routes, BOTTOM_NAV_ROUTES } from './navigation/routes';


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

  // Setting the language means setting the OS per-app locale, then reflecting that in the
  // context. There is no app-side "language" preference — the OS is the single source of truth,
  // so a change made in Android's App-languages settings shows up here on the next boot, and a
  // change made here shows up in those settings.
  const applyLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    ConfigRepository.setAppLocale(lang).catch(() => {});
  }, []);

  useEffect(() => {
    // App-wide listeners that must run whether or not their consuming screen ever mounts. Kept
    // as an explicit boot call, not an import side effect. Idempotent.
    registerSeriesDigestIndexListener();

    async function boot() {
      const lang = await ConfigRepository.getAppLocale().catch(() => 'en');
      setLanguageState(lang);

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

  // The user changed the language in Android's per-app settings while the app is open — the
  // Activity handled the config change without a restart (configChanges includes `locale`) and
  // pinged us. Re-read the effective locale and re-render; don't write it back (the OS already
  // holds it).
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('appLocaleChanged', () => {
      ConfigRepository.getAppLocale()
        .then(setLanguageState)
        .catch(() => {});
    });
    return () => sub.remove();
  }, []);

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
        <StartupProvider>
          <NavigationContainer ref={navRef} onStateChange={onNavigationStateChange}>
            <RootNavigator
              onSetupComplete={() => {
                navRef.current?.reset({ index: 0, routes: [{ name: Routes.HUB }] });
              }}
            />
          </NavigationContainer>
        </StartupProvider>
      </View>
    </LanguageContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1A1A2E' },
});
