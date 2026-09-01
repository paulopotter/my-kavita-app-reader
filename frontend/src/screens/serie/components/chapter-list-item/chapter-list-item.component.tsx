import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { SerieChapter } from '../../../../shared';
import { styles } from './chapter-list-item.styles';

interface Props {
  chapter: SerieChapter;
  // Finished label string, composed by the caller via ChapterTool.format.title — this dumb
  // component never derives it (real title vs. "Capítulo N" vs. special-label is domain logic
  // that lives in the tool, not here).
  title: string;
  index: number;
  selectionMode: boolean;
  selected: boolean;
  onPress: (chapterId: string) => void;
  onLongPress: (chapterId: string) => void;
}

// Dumb: only decides how to render the data it's given (zebra striping by index, checkbox when
// in selection mode) — no fetching, no domain logic.
export function ChapterListItem({ chapter, title, index, selectionMode, selected, onPress, onLongPress }: Props) {
  const isRead = chapter.readStatus === 'READ';
  const isZebra = index % 2 === 1;

  return (
    <TouchableOpacity
      style={[styles.root, isZebra && styles.zebra, isRead && styles.read, selected && styles.selected]}
      onPress={() => onPress(chapter.id)}
      onLongPress={() => onLongPress(chapter.id)}
      activeOpacity={0.7}>
      <View style={styles.checkbox}>
        {selectionMode && <View style={[styles.checkboxBox, selected && styles.checkboxBoxChecked]} />}
      </View>
      <Text style={[styles.title, isRead && styles.titleRead, selected && styles.titleSelected]} numberOfLines={1}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
