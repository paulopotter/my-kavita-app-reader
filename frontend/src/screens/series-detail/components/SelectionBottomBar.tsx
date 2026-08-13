import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, Shuffle, SquareCheckBig, X } from 'lucide-react-native';
import { Strings } from '../../../shared/i18n/strings';

const ICON_SIZE = 22;
const ICON_COLOR = '#E94560';

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
      <TouchableOpacity style={styles.button} onPress={onSelectAll} activeOpacity={0.7}>
        <SquareCheckBig size={ICON_SIZE} color={ICON_COLOR} />
        <Text style={styles.buttonText}>{t.seriesDetailSelectionSelectAll}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onInvertSelection} activeOpacity={0.7}>
        <Shuffle size={ICON_SIZE} color={ICON_COLOR} />
        <Text style={styles.buttonText}>{t.seriesDetailSelectionInvert}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onMarkRead} activeOpacity={0.7}>
        <Check size={ICON_SIZE} color={ICON_COLOR} />
        <Text style={styles.buttonText}>{t.seriesDetailSelectionMarkRead}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onMarkUnread} activeOpacity={0.7}>
        <X size={ICON_SIZE} color={ICON_COLOR} />
        <Text style={styles.buttonText}>{t.seriesDetailSelectionMarkUnread}</Text>
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
    paddingVertical: 14,
    minHeight: 76,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  buttonText: { color: '#E94560', fontSize: 11, fontWeight: '600', textAlign: 'center' },
});
