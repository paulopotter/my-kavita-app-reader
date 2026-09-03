import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Check, Shuffle, SquareCheckBig, X } from 'lucide-react-native';
import type { Strings } from '../../../../shared/i18n';
import { styles } from './selection-bottom-bar.styles';

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
