import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  visible: boolean;
}

export function ReaderOfflineBanner({ visible }: Props) {
  if (!visible) {return null;}

  return (
    <View style={styles.root}>
      <Text style={styles.text}>Sem conexão</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    bottom: 8,
    left: 16,
    right: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(233, 69, 96, 0.9)',
    alignItems: 'center',
  },
  text: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
