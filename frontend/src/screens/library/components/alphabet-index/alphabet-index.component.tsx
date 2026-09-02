import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './alphabet-index.styles';

// Dumb component: renders the letter rail and reports which row index to jump to. The letter →
// index map is computed in the hook (library.hooks.ts).
export interface AlphabetIndexProps {
  entries: [letter: string, rowIndex: number][];
  onJump: (rowIndex: number) => void;
}

export function AlphabetIndex({ entries, onJump }: AlphabetIndexProps) {
  if (entries.length === 0) {
    return null;
  }
  return (
    <View style={styles.bar} pointerEvents="box-none">
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {entries.map(([letter, rowIndex]) => (
          <TouchableOpacity key={letter} style={styles.item} onPress={() => onJump(rowIndex)}>
            <Text style={styles.letter}>{letter}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
