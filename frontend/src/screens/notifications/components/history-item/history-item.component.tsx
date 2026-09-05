import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './history-item.styles';

// Dumb: an unread dot, series name, body-equivalent summary, relative timestamp (already
// formatted by the hook via DateTool), a delete affordance, and a tap that marks it read
// (mirrors README decision 7's "opening it marks that history item as read" for the system
// notification's own tap — same rule applies here for the in-app row).
export interface HistoryItemProps {
  seriesName: string;
  bodyText: string;
  timestampLabel: string;
  read: boolean;
  onPress: () => void;
  onDelete: () => void;
  deleteLabel: string;
}

export function HistoryItem({ seriesName, bodyText, timestampLabel, read, onPress, onDelete, deleteLabel }: HistoryItemProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.dot, read ? styles.dotRead : styles.dotUnread]} />
      <View style={styles.body}>
        <Text style={[styles.seriesName, read && styles.seriesNameRead]} numberOfLines={1}>
          {seriesName}
        </Text>
        <Text style={styles.bodyText} numberOfLines={2}>
          {bodyText}
        </Text>
        <Text style={styles.timestamp}>{timestampLabel}</Text>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={8} accessibilityLabel={deleteLabel}>
        <Text style={styles.deleteTxt}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
