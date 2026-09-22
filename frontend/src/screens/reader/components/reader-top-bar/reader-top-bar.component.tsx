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
  // 1-indexed for display (currentPage is 0-indexed internally) — undefined pageIndicatorText
  // means the caller decided there's nothing worth showing (e.g. a chapter with 0/1 pages).
  pageIndicatorText?: string;
  onBack: () => void;
  visible: boolean;
}

// Dumb: renders the series name + chapter title + optional page indicator it's given, and fires
// onBack.
export function ReaderTopBar({ seriesName, chapterTitle, pageIndicatorText, onBack, visible }: Props) {
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
        <View style={styles.titlesRow}>
          <Text style={styles.seriesName} numberOfLines={1}>
            {seriesName}
          </Text>
          {pageIndicatorText != null && (
            <Text style={styles.pageIndicator} numberOfLines={1}>
              {pageIndicatorText}
            </Text>
          )}
        </View>
        <Text style={styles.chapterTitle} numberOfLines={1}>
          {chapterTitle}
        </Text>
      </View>
    </View>
  );
}
