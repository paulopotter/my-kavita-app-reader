import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { AppVersions } from '../../shared/components/app-versions';
import { useStrings } from '../../shared/i18n';
import { type ThemeName } from '../../shared/theme';
import { useTheme } from '../../shared/context';
import { Select } from './components/select';
import { LanguageToggle } from './components/language-toggle';
import { useConfigLanguage, useConfigMenu } from './config.hooks';
import { configStyles } from './config.styles';
import type { ConfigScreenProps, ConfigSubScreen } from './config.types';
import { DebugScreen } from './debug';
import { NotificationsScreen } from './notifications';
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
    case 'notifications':
      return <NotificationsScreen onBack={goBack} />;
    case 'debug':
      return <DebugScreen onBack={goBack} />;
    default:
      return <ConfigMenu onNavigate={setScreen} />;
  }
}

// ── Menu ─────────────────────────────────────────────────────────────────────
function ConfigMenu({ onNavigate }: { onNavigate: (s: ConfigSubScreen) => void }) {
  const { colors, text, themeName, available, setTheme } = useTheme();
  const styles = useMemo(() => configStyles({ colors, text }), [colors, text]);
  const t = useStrings();
  const { language, changeLanguage } = useConfigLanguage();
  const { debugUnlocked, unlockDebug } = useConfigMenu();

  // A theme's display name is translatable, so it cannot be the registry key. An identity added
  // without a string yet falls back to its key rather than rendering an empty row.
  const themeLabels: Record<string, string> = useMemo(
    () => ({ default: t.themeNameDefault, teal: t.themeNameTeal }),
    [t],
  );
  const themeOptions = useMemo(
    () => available.map(name => ({ id: name, label: themeLabels[name] ?? name })),
    [available, themeLabels],
  );

  return (
    <View style={styles.root}>
      <Text style={styles.pageTitle}>{t.configTitle}</Text>

      <TouchableOpacity style={styles.menuRow} onPress={() => onNavigate('server')}>
        <Text style={styles.menuRowLabel}>{t.configMenuServer}</Text>
        <ChevronRight size={20} color={colors.icon.secondary} />
      </TouchableOpacity>
      <View style={[styles.divider, styles.dividerInset]} />

      <TouchableOpacity style={styles.menuRow} onPress={() => onNavigate('reader')}>
        <Text style={styles.menuRowLabel}>{t.configMenuReading}</Text>
        <ChevronRight size={20} color={colors.icon.secondary} />
      </TouchableOpacity>
      <View style={[styles.divider, styles.dividerInset]} />

      <TouchableOpacity style={styles.menuRow} onPress={() => onNavigate('serie')}>
        <Text style={styles.menuRowLabel}>{t.configMenuChapter}</Text>
        <ChevronRight size={20} color={colors.icon.secondary} />
      </TouchableOpacity>
      <View style={[styles.divider, styles.dividerInset]} />

      <TouchableOpacity style={styles.menuRow} onPress={() => onNavigate('notifications')}>
        <Text style={styles.menuRowLabel}>{t.configMenuNotifications}</Text>
        <ChevronRight size={20} color={colors.icon.secondary} />
      </TouchableOpacity>
      <View style={[styles.divider, styles.dividerInset]} />

      <Text style={styles.themeLabel}>{t.configMenuTheme}</Text>
      <View style={styles.themeField}>
        <Select
          value={themeName}
          options={themeOptions}
          onChange={(id: string | undefined) => id && setTheme(id as ThemeName)}
        />
      </View>

      {debugUnlocked && (
        <>
          <TouchableOpacity style={styles.menuRow} onPress={() => onNavigate('debug')}>
            <Text style={styles.menuRowLabel}>Debug</Text>
            <ChevronRight size={20} color={colors.icon.secondary} />
          </TouchableOpacity>
          <View style={[styles.divider, styles.dividerInset]} />
        </>
      )}

      <View style={styles.menuFooter}>
        <LanguageToggle language={language} onChange={changeLanguage} />
        <AppVersions t={t} onDebugUnlocked={unlockDebug} />
      </View>
    </View>
  );
}
