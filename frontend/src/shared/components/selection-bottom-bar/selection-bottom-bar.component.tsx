import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { selectionBottomBarStyles } from './selection-bottom-bar.styles';

import { useTheme } from '../../context';
import { useStyles } from '../../context';

const ICON_SIZE = 22;

export interface SelectionBottomBarAction {
  // Distinguishes actions across re-renders without relying on array index (a screen's action
  // list is static, but a stable key keeps intent explicit).
  key: string;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}

interface Props {
  actions: SelectionBottomBarAction[];
}

// Generic selection-mode action bar — any screen with a "long-press to select, act on many"
// flow (Serie's chapter list, Notifications' history list) passes its own actions in. Visual
// shape only; a screen's hook owns what each action actually does.
export function SelectionBottomBar({ actions }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(selectionBottomBarStyles);
  return (
    <View style={styles.root}>
      {actions.map(({ key, icon: Icon, label, onPress }) => (
        <TouchableOpacity key={key} style={styles.button} onPress={onPress} activeOpacity={0.7}>
          <Icon size={ICON_SIZE} color={colors.icon.button.secondary} />
          <Text style={styles.buttonText}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
