import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Circle, MoreHorizontal } from 'lucide-react-native';
import { useTheme } from '../../../../shared/theme';
import { makeStyles } from './row.styles';

// A single configured item — a Kavita URL, the API key, or a BFF server. Dumb: an activity dot,
// a primary line, an optional secondary line, and a "more" menu that calls props.onMenu. The
// screen owns the context menu and every action.
export interface RowProps {
  active: boolean;
  primary: string;
  secondary?: string;
  // When secondary is meant to read as "nothing linked" — renders italic/dim.
  secondaryEmpty?: boolean;
  // A small dim label right before the menu button (e.g. a URL's priority: "P0").
  trailing?: string;
  onMenu: () => void;
}

export function Row({ active, primary, secondary, secondaryEmpty, trailing, onMenu }: RowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const dotTint = active ? colors.icon.status.good : colors.icon.status.off;
  return (
    <View style={styles.row}>
      <Circle size={8} color={dotTint} fill={dotTint} />
      <View style={styles.body}>
        <Text style={styles.primary} numberOfLines={1}>
          {primary}
        </Text>
        {secondary != null && (
          <Text style={secondaryEmpty ? styles.secondaryNone : styles.secondary} numberOfLines={1}>
            {secondary}
          </Text>
        )}
      </View>
      {trailing != null && <Text style={styles.trailing}>{trailing}</Text>}
      <TouchableOpacity onPress={onMenu} hitSlop={8}>
        <MoreHorizontal size={20} color={colors.icon.secondary} />
      </TouchableOpacity>
    </View>
  );
}
