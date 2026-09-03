import React from 'react';
import { View } from 'react-native';
import { colors } from '../../../shared/theme';
import { LanguageToggle } from '../components/language-toggle';
import { ServerScreen } from '../server';
import { useSetup } from './setup.hooks';
import { styles } from './setup.styles';

// Onboarding. Reached only by the splash redirect (no server/auth) or a data wipe — never from
// the Config menu. Almost no code of its own: the language toggle on top, the server screen as
// the body (in "setup" mode via onComplete — no back chevron, shows a "go to Library" CTA once a
// server + key exist).
export interface SetupScreenProps {
  onComplete: () => void;
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const { language, changeLanguage } = useSetup();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.langBar}>
        <LanguageToggle language={language} onChange={changeLanguage} />
      </View>
      <ServerScreen onComplete={onComplete} />
    </View>
  );
}
