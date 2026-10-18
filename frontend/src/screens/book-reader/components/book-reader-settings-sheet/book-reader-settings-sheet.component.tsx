import React from 'react';
import { Modal, Pressable, ScrollView, Text } from 'react-native';
import { bookReaderSettingsSheetStyles } from './book-reader-settings-sheet.styles';
import { useStyles } from '../../../../shared/context';
import { BookAppearanceFields } from '../../../../shared/components/book-appearance-fields';
import type { Strings } from '../../../../shared/i18n';
import type { BookAppearance, BookReadingMode } from '../../../../shared/tools/books';

interface Props {
  visible: boolean;
  appearance: BookAppearance;
  mode: BookReadingMode;
  t: Strings;
  onChangeMode: (mode: BookReadingMode) => void;
  onChange: <K extends keyof BookAppearance>(key: K, value: BookAppearance[K]) => void;
  onClose: () => void;
}

// Dumb: shows the reader's choices and reports each change. What a choice does to the page is the
// document's job; where it is saved is the hook's.
export function BookReaderSettingsSheet({ visible, appearance, mode, t, onChangeMode, onChange, onClose }: Props) {
  const styles = useStyles(bookReaderSettingsSheetStyles);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="book-reader-settings-backdrop">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{t.bookReaderAppearance}</Text>

          <ScrollView contentContainerStyle={styles.content}>
            <BookAppearanceFields appearance={appearance} mode={mode} t={t} onChangeMode={onChangeMode} onChange={onChange} />
          </ScrollView>

          <Pressable style={styles.closeButton} onPress={onClose} accessibilityRole="button">
            <Text style={styles.closeText}>{t.bookReaderClose}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
