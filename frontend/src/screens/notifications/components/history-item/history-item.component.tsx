import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { CheckCircle2, Circle, Info, X } from 'lucide-react-native';
import { styles } from './history-item.styles';
import { colors } from '../../../../shared/theme';

// Dumb: an unread dot, series cover (when known), series name, body-equivalent summary, relative
// timestamp (already formatted by the hook via DateTool), a delete affordance, an info affordance
// (opens the detail popup), and a tap that marks it read (mirrors README decision 7's "opening it
// marks that history item as read" for the system notification's own tap — same rule applies
// here for the in-app row). Long-press enters selection mode (screen-level state); while in it,
// a checkbox replaces the unread dot and a tap toggles selection instead of opening the row.
export interface HistoryItemProps {
  seriesName: string;
  bodyText: string;
  timestampLabel: string;
  read: boolean;
  // Undefined while not yet enriched (lazy, per-viewport — see notifications.hooks.ts) or when
  // this row has no series to show a cover for.
  coverUrl?: string;
  selectionMode: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
  onInfo: () => void;
  deleteLabel: string;
  infoLabel: string;
}

export function HistoryItem({
  seriesName,
  bodyText,
  timestampLabel,
  read,
  coverUrl,
  selectionMode,
  selected,
  onPress,
  onLongPress,
  onDelete,
  onInfo,
  deleteLabel,
  infoLabel,
}: HistoryItemProps) {
  return (
    <TouchableOpacity
      style={[styles.row, selected && styles.rowSelected]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      <View style={styles.indicator}>
        {selectionMode ? (
          selected ? <CheckCircle2 size={20} color={colors.accent} /> : <Circle size={20} color={colors.mutedAlt} />
        ) : (
          <View style={[styles.dot, read ? styles.dotRead : styles.dotUnread]} />
        )}
      </View>
      <Image source={coverUrl ? { uri: coverUrl } : undefined} style={[styles.thumb, !coverUrl && styles.thumbPlaceholder]} resizeMode="cover" />
      <View style={styles.body}>
        <Text style={[styles.seriesName, read && styles.seriesNameRead]} numberOfLines={1}>
          {seriesName}
        </Text>
        <Text style={styles.bodyText} numberOfLines={2}>
          {bodyText}
        </Text>
        <Text style={styles.timestamp}>{timestampLabel}</Text>
      </View>
      <View style={[styles.trailingActions, selectionMode && styles.trailingActionsHidden]} pointerEvents={selectionMode ? 'none' : 'auto'}>
        <TouchableOpacity style={styles.iconBtn} onPress={onInfo} hitSlop={8} accessibilityLabel={infoLabel}>
          <Info size={18} color={colors.mutedAlt} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={onDelete} hitSlop={8} accessibilityLabel={deleteLabel}>
          <X size={18} color={colors.mutedAlt} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
