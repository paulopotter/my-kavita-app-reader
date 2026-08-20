import React from 'react';
import { Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  seriesName: string;
  chapterTitle: string;
  onBack: () => void;
  visible: boolean;
}

// Gap entre a barra de notificação (status bar) e o nome da série — o header fica colado nela
// (distância exata da status bar, não um valor fixo estimado que sobra/falta dependendo do
// dispositivo/notch).
const STATUS_BAR_GAP = 6;
const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

export function ReaderTopBar({ seriesName, chapterTitle, onBack, visible }: Props) {
  if (!visible) {return null;}

  return (
    <View style={[styles.root, { paddingTop: statusBarHeight + STATUS_BAR_GAP }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
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
    alignItems: 'stretch',
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  backButton: {
    justifyContent: 'center',
    marginRight: 12,
  },
  backArrow: { color: '#FFFFFF', fontSize: 32, lineHeight: 32 },
  titles: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  seriesName: { color: '#A0AEC0', fontSize: 11 },
  chapterTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', alignSelf: 'flex-start' },
});
