import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Chapter } from '../../../shared/bridge/series';
import { chapterDisplayTitle } from '../../../shared/transforms/chapter';

interface Props {
  chapter: Chapter;
  index: number;
  selectionMode: boolean;
  selected: boolean;
  onPress: (chapterId: string) => void;
  onLongPress: (chapterId: string) => void;
}

export function ChapterListItem({ chapter, index, selectionMode, selected, onPress, onLongPress }: Props) {
  const isRead = chapter.readStatus === 'READ';
  const isZebra = index % 2 === 1;

  return (
    <TouchableOpacity
      style={[styles.root, isZebra && styles.zebra, isRead && styles.read]}
      onPress={() => onPress(chapter.id)}
      onLongPress={() => onLongPress(chapter.id)}
      activeOpacity={0.7}>
      <View style={styles.checkbox}>
        {selectionMode && (
          <View style={[styles.checkboxBox, selected && styles.checkboxBoxChecked]} />
        )}
      </View>
      <Text style={[styles.title, isRead && styles.titleRead]} numberOfLines={1}>
        {chapterDisplayTitle(chapter)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#16213E',
  },
  zebra: { backgroundColor: '#1A1A2E' },
  read: { opacity: 0.5 },
  checkbox: { width: 24, alignItems: 'center', justifyContent: 'center' },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#A0AEC0',
  },
  checkboxBoxChecked: { backgroundColor: '#E94560', borderColor: '#E94560' },
  title: { color: '#FFFFFF', fontSize: 14, marginLeft: 8, flex: 1 },
  titleRead: { color: '#A0AEC0' },
});
