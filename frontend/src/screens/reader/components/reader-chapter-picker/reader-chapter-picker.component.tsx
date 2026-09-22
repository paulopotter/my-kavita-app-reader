import React, { useMemo, useRef } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { CHAPTER_PICKER_ROW_HEIGHT, readerChapterPickerStyles } from './reader-chapter-picker.styles';
import { useStyles } from '../../../../shared/context';
import { ChapterTool } from '../../../../shared/tools/chapters';
import { border } from '../../../../shared/theme';
import type { Strings } from '../../../../shared/i18n';
import type { OrderedChapter } from '../../reader.types';

export interface ReaderChapterPickerProps {
  visible: boolean;
  chapters: OrderedChapter[];
  focusedChapterId: string;
  t: Strings;
  onClose: () => void;
  onSelect: (chapterId: string) => void;
}

// Row + its own trailing separator (ItemSeparatorComponent draws one after every item but the
// last) — getItemLayout has to account for it or a jump to a distant chapter overshoots.
const ITEM_HEIGHT = CHAPTER_PICKER_ROW_HEIGHT + border.small;

// A bottom sheet listing every chapter of the series (reader.order, already in memory — no extra
// fetch), so the user can jump anywhere instead of only prev/next. Dumb: picks are reported via
// onSelect; the screen/hook decides what jumping there means (goToChapter).
export function ReaderChapterPicker({ visible, chapters, focusedChapterId, t, onClose, onSelect }: ReaderChapterPickerProps) {
  const styles = useStyles(readerChapterPickerStyles);
  const listRef = useRef<FlatList<OrderedChapter>>(null);

  const focusedIndex = useMemo(
    () => chapters.findIndex(c => c.id === focusedChapterId),
    [chapters, focusedChapterId],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{t.readerChapterPickerTitle}</Text>
          {chapters.length === 0 ? (
            <Text style={styles.emptyText}>{t.readerLoading}</Text>
          ) : (
            <FlatList
              ref={listRef}
              data={chapters}
              keyExtractor={c => c.id}
              initialScrollIndex={focusedIndex >= 0 ? focusedIndex : undefined}
              getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
              // A stale initialScrollIndex on a mispositioned list is a worse failure than a
              // silent no-op — this is a convenience jump, not a requirement.
              onScrollToIndexFailed={() => {}}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => {
                const focused = item.id === focusedChapterId;
                return (
                  <Pressable
                    style={[styles.row, focused && styles.rowFocused]}
                    onPress={() => {
                      onClose();
                      onSelect(item.id);
                    }}>
                    <Text
                      style={[
                        styles.rowTitle,
                        item.readStatus === 'READ' && styles.rowTitleRead,
                        focused && styles.rowTitleFocused,
                      ]}
                      numberOfLines={1}>
                      {ChapterTool.format.title(item, t)}
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
