import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { useStyles, useTheme } from '../../../../../shared/context';
import { icon } from '../../../../../shared/theme';
import { chipStyles } from './chip.styles';

// Dumb: a pill with a label. `selected` chips carry a remove mark and are the ones already in the
// filter; the others are plain and add themselves when tapped. The accessibility label for the
// remove action arrives already localized.
export interface ChipProps {
  label: string;
  selected?: boolean;
  removeLabel?: string;
  onPress: () => void;
}

export function Chip({ label, selected = false, removeLabel, onPress }: ChipProps) {
  const { colors } = useTheme();
  const styles = useStyles(chipStyles);
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={selected ? removeLabel : label}>
      <Text style={styles.label}>{label}</Text>
      {selected && <X size={icon.size[2]} color={colors.icon.secondary} style={styles.remove} />}
    </TouchableOpacity>
  );
}
