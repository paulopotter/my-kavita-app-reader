import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { SerieChapter } from '../../../../shared';
import type { Strings } from '../../../../shared/i18n/strings';
import { styles } from './chapter-list-item.styles';

interface Props {
  chapter: SerieChapter;
  index: number;
  selectionMode: boolean;
  selected: boolean;
  t: Strings;
  onPress: (chapterId: string) => void;
  onLongPress: (chapterId: string) => void;
}

// Dumb: only decides how to render the data it's given (zebra striping by index, checkbox when
// in selection mode) — no fetching, no domain logic. The exact label a chapter shows (real title
// vs. a "Chapter N" fallback vs. a special-label) is decided here, not upstream, since it's about
// HOW this one component presents SerieChapter's raw fields (title/number/decimalNumber/
// specialLabel/isSpecial) — SerieTool only carries the raw data, never a pre-rendered string.
function displayTitle(chapter: SerieChapter, t: Strings): string {
  if (chapter.isSpecial && chapter.specialLabel) {return chapter.specialLabel;}

  const num = chapter.decimalNumber ?? chapter.number;
  const hasRealTitle = chapter.title.trim().length > 0 && chapter.title !== String(num);

  if (hasRealTitle) {return num != null ? `${num}. ${chapter.title}` : chapter.title;}
  if (num != null) {return t.seriesDetailChapterNumberLabel.replace('{0}', String(num));}
  return t.seriesDetailChapterUntitled;
}

export function ChapterListItem({ chapter, index, selectionMode, selected, t, onPress, onLongPress }: Props) {
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
        {displayTitle(chapter, t)}
      </Text>
    </TouchableOpacity>
  );
}
