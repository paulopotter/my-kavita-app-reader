import React, { useEffect, useState } from 'react';
import { BackHandler, Text, TouchableOpacity, View } from 'react-native';
import { AppVersions } from '../../shared/components/app-versions';
import { useStrings } from '../../shared/i18n';
import { LanguageToggle } from './components/language-toggle';
import { useConfigLanguage, useConfigMenu } from './config.hooks';
import { styles } from './config.styles';
import type { ConfigScreenProps, ConfigSubScreen } from './config.types';
import { DebugScreen } from './debug';
import { ReaderPrefsScreen } from './reader';
import { SerieSortScreen } from './serie';
import { ServerScreen } from './server';

// Thin router: the Config menu + which sub-screen is open. All the real work is in each sub-screen
// (server/reader/serie/debug), each its own folder on the current convention. 'setup' is not
// routed here — see config.types.
export function ConfigScreen({ onRegisterBackHandler, onServerCleared }: ConfigScreenProps) {
  const [screen, setScreen] = useState<ConfigSubScreen>('menu');
  const goBack = () => setScreen('menu');

  useEffect(() => {
    if (screen === 'menu') {
      onRegisterBackHandler?.(null);
      return;
    }
    onRegisterBackHandler?.(() => {
      goBack();
      return true;
    });
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  switch (screen) {
    case 'server':
      return <ServerScreen onBack={goBack} onServerCleared={onServerCleared} />;
    case 'reader':
      return <ReaderPrefsScreen onBack={goBack} />;
    case 'serie':
      return <SerieSortScreen onBack={goBack} />;
    case 'debug':
      return <DebugScreen onBack={goBack} />;
    default:
      return <ConfigMenu onNavigate={setScreen} />;
  }
}

// ── Menu ─────────────────────────────────────────────────────────────────────
function ConfigMenu({ onNavigate }: { onNavigate: (s: ConfigSubScreen) => void }) {
  const t = useStrings();
  const { language, changeLanguage } = useConfigLanguage();
  const { debugUnlocked, unlockDebug } = useConfigMenu();

  return (
    <View style={styles.root}>
      <Text style={styles.pageTitle}>{t.configTitle}</Text>

      <TouchableOpacity style={styles.menuRow} onPress={() => onNavigate('server')}>
        <Text style={styles.menuRowLabel}>{t.configMenuServer}</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>
      <View style={styles.divider} />

      <TouchableOpacity style={styles.menuRow} onPress={() => onNavigate('reader')}>
        <Text style={styles.menuRowLabel}>{t.configMenuReading}</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>
      <View style={styles.divider} />

      <TouchableOpacity style={styles.menuRow} onPress={() => onNavigate('serie')}>
        <Text style={styles.menuRowLabel}>{t.configMenuChapter}</Text>
        <Text style={styles.menuRowArrow}>›</Text>
      </TouchableOpacity>
      <View style={styles.divider} />

      {debugUnlocked && (
        <>
          <TouchableOpacity style={styles.menuRow} onPress={() => onNavigate('debug')}>
            <Text style={styles.menuRowLabel}>Debug</Text>
            <Text style={styles.menuRowArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
        </>
      )}

      <View style={styles.menuFooter}>
        <LanguageToggle language={language} onChange={changeLanguage} />
        <AppVersions t={t} onDebugUnlocked={unlockDebug} />
      </View>
    </View>
  );
}
