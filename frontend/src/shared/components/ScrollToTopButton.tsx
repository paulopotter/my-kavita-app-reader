import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface Props {
  onPress: () => void;
  right?: number;
}

export function ScrollToTopButton({ onPress, right = 16 }: Props) {
  return (
    <TouchableOpacity style={[styles.button, { right }]} onPress={onPress}>
      <Text style={styles.icon}>↑</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E94560',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  icon: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', lineHeight: 24 },
});
