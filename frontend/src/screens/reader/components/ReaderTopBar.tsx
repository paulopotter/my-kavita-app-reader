import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  seriesName: string;
  chapterTitle: string;
  onBack: () => void;
  visible: boolean;
}

export function ReaderTopBar({ seriesName, chapterTitle, onBack, visible }: Props) {
  if (!visible) {return null;}

  return (
    <View style={styles.root}>
      <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={styles.backArrow}>{'‹'}</Text>
      </TouchableOpacity>
      <View style={styles.titles}>
        <Text style={styles.seriesName} numberOfLines={1}>
          {seriesName}
        </Text>
        <Text style={styles.chapterTitle} numberOfLines={1}>
          {chapterTitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  backArrow: { color: '#FFFFFF', fontSize: 32, marginRight: 12 },
  titles: { flex: 1 },
  seriesName: { color: '#A0AEC0', fontSize: 12 },
  chapterTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
