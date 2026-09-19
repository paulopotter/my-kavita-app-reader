import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Circle, CornerDownRight, MoreHorizontal } from 'lucide-react-native';
import { useTheme, useStyles } from '../../../../shared/context';
import { rowStyles } from './row.styles';
import { icon } from '../../../../shared/theme';

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
  const styles = useStyles(rowStyles);
  const dotTint = active ? colors.icon.status.good : colors.icon.status.off;
  return (
    <View style={styles.row}>
      <Circle size={icon.size.dot} color={dotTint} fill={dotTint} />
      <View style={styles.body}>
        <Text style={styles.primary} numberOfLines={1}>
          {primary}
        </Text>
        {secondary != null && (
          <View style={styles.secondaryRow}>
            {/* The arrow marks a sub-line that points at something. "Nothing linked" points at
                nothing, so it stays a bare italic line. */}
            {!secondaryEmpty && <CornerDownRight size={icon.size[2]} color={colors.icon.tertiary} />}
            <Text style={secondaryEmpty ? styles.secondaryNone : styles.secondary} numberOfLines={1}>
              {secondary}
            </Text>
          </View>
        )}
      </View>
      {trailing != null && <Text style={styles.trailing}>{trailing}</Text>}
      <TouchableOpacity onPress={onMenu} hitSlop={8}>
        <MoreHorizontal size={icon.size[5]} color={colors.icon.secondary} />
      </TouchableOpacity>
    </View>
  );
}
