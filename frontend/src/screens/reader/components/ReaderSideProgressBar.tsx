import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  totalPages: number;
  currentPage: number;
  onPageSelect: (index: number) => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  visible: boolean;
}

export function ReaderSideProgressBar({
  totalPages,
  currentPage,
  onPageSelect,
  onPrevChapter,
  onNextChapter,
  hasPrev,
  hasNext,
  visible,
}: Props) {
  if (!visible) {return null;}

  return (
    <View style={styles.root}>
      <TouchableOpacity
        testID="side-bar-prev"
        style={styles.arrowButton}
        disabled={!hasPrev}
        onPress={() => {
          if (hasPrev) {onPrevChapter();}
        }}>
        <Text style={[styles.arrow, !hasPrev && styles.arrowDisabled]}>{'▲'}</Text>
      </TouchableOpacity>
      <View style={styles.dots}>
        {Array.from({ length: totalPages }, (_, index) => (
          <TouchableOpacity key={index} onPress={() => onPageSelect(index)} hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}>
            <View style={[styles.dot, index === currentPage && styles.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        testID="side-bar-next"
        style={styles.arrowButton}
        disabled={!hasNext}
        onPress={() => {
          if (hasNext) {onNextChapter();}
        }}>
        <Text style={[styles.arrow, !hasNext && styles.arrowDisabled]}>{'▼'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: 8,
    top: '20%',
    bottom: '20%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowButton: {
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 6,
  },
  arrow: { color: '#FFFFFF', fontSize: 20 },
  arrowDisabled: { color: '#4A5568' },
  dots: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 8,
    width: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#A0AEC0', marginVertical: 2 },
  dotActive: { backgroundColor: '#E94560', width: 8, height: 8, borderRadius: 4 },
});
