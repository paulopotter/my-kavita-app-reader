import React from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Strings } from '../../../shared/i18n/strings';

interface Props {
  hasNext: boolean;
  chapterTitle: string | null;
  onLayout: (height: number) => void;
  t: Strings;
}

export function ChapterFooter({ hasNext, chapterTitle, onLayout, t }: Props) {
  const handleLayout = (event: LayoutChangeEvent) => {
    onLayout(event.nativeEvent.layout.height);
  };

  return (
    <View testID="chapter-footer-root" style={styles.root} onLayout={handleLayout}>
      <Text style={styles.endLabel}>{t.readerEndOfChapter}</Text>
      {hasNext && chapterTitle != null && (
        <>
          <Text style={styles.nextLabel}>{t.readerNextChapterLabel}</Text>
          <Text style={styles.nextPreview} numberOfLines={1}>
            {chapterTitle}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  endLabel: { color: '#A0AEC0', fontSize: 14, marginBottom: 16 },
  nextLabel: { color: '#A0AEC0', fontSize: 12, marginBottom: 4 },
  nextPreview: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
