import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './language-toggle.styles';

// Dumb PT/EN switch. Two labelled taps + a sliding track, all driven by props. Used by the
// Config menu footer and by the onboarding (setup) screen. The persist-and-re-render rule lives
// in useConfigLanguage (config.hooks), never here.
export interface LanguageToggleProps {
  language: string;
  onChange: (next: string) => void;
}

export function LanguageToggle({ language, onChange }: LanguageToggleProps) {
  const isPt = language === 'pt-BR';
  const toggle = () => onChange(isPt ? 'en' : 'pt-BR');

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.option, isPt && styles.optionActive]}
        onPress={() => !isPt || onChange('pt-BR')}>
        <Text style={[styles.optionTxt, isPt && styles.optionTxtActive]}>🇧🇷 PT</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.track} onPress={toggle}>
        <View style={[styles.thumb, !isPt && styles.thumbRight]} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, !isPt && styles.optionActive]}
        onPress={() => isPt && onChange('en')}>
        <Text style={[styles.optionTxt, !isPt && styles.optionTxtActive]}>🇺🇸 EN</Text>
      </TouchableOpacity>
    </View>
  );
}
