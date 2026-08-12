import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Strings } from '../../../shared/i18n/strings';

interface Props {
  t: Strings;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onSelectAll: () => void;
  onInvertSelection: () => void;
}

export function SelectionBottomBar({ t, onMarkRead, onMarkUnread, onSelectAll, onInvertSelection }: Props) {
  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.button} onPress={onMarkRead} activeOpacity={0.7}>
        <Text style={styles.buttonText}>{t.seriesDetailSelectionMarkRead}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onMarkUnread} activeOpacity={0.7}>
        <Text style={styles.buttonText}>{t.seriesDetailSelectionMarkUnread}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onSelectAll} activeOpacity={0.7}>
        <Text style={styles.buttonText}>{t.seriesDetailSelectionSelectAll}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onInvertSelection} activeOpacity={0.7}>
        <Text style={styles.buttonText}>{t.seriesDetailSelectionInvert}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    backgroundColor: '#16213E',
    borderTopWidth: 1,
    borderTopColor: '#0F3460',
    paddingVertical: 8,
  },
  button: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  buttonText: { color: '#E94560', fontSize: 11, fontWeight: '600', textAlign: 'center' },
});
