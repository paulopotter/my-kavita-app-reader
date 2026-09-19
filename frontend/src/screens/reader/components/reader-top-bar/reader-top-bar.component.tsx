import React from 'react';
import { Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { STATUS_BAR_GAP, statusBarHeight, readerTopBarStyles } from './reader-top-bar.styles';
import { useTheme, useStyles } from '../../../../shared/context';
import { icon } from '../../../../shared/theme';
import { IconButton } from '../../../../shared/components/icon-button';

interface Props {
  seriesName: string;
  chapterTitle: string;
  onBack: () => void;
  visible: boolean;
}

// Dumb: renders the series name + chapter title it's given and fires onBack.
export function ReaderTopBar({ seriesName, chapterTitle, onBack, visible }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(readerTopBarStyles);
  if (!visible) {return null;}

  return (
    <View style={[styles.root, { paddingTop: statusBarHeight + STATUS_BAR_GAP }]}>
      <IconButton
        icon={ChevronLeft}
        glyph="chevron"
        size={icon.size[9]}
        color={colors.icon.primary}
        onPress={onBack}
        style={styles.backButton}
        alignStroke
      />
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
