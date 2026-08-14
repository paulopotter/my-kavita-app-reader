import React from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

interface Props {
  chapterTitle: string;
  seriesName: string;
  onLayout: (height: number) => void;
}

export function ChapterHeader({ chapterTitle, seriesName, onLayout }: Props) {
  const handleLayout = (event: LayoutChangeEvent) => {
    onLayout(event.nativeEvent.layout.height);
  };

  return (
    <View testID="chapter-header-root" style={styles.root} onLayout={handleLayout}>
      <Text style={styles.seriesName} numberOfLines={1}>
        {seriesName}
      </Text>
      <Text style={styles.chapterTitle} numberOfLines={2}>
        {chapterTitle}
      </Text>
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
  seriesName: { color: '#A0AEC0', fontSize: 14, marginBottom: 8 },
  chapterTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '600', textAlign: 'center' },
});
