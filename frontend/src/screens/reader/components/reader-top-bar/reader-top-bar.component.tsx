import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { STATUS_BAR_GAP, statusBarHeight, styles } from './reader-top-bar.styles';

interface Props {
  seriesName: string;
  chapterTitle: string;
  onBack: () => void;
  visible: boolean;
}

// Dumb: renders the series name + chapter title it's given and fires onBack.
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
