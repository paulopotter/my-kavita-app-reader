import React from 'react';
import { Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { bookReaderTopBarStyles } from './book-reader-top-bar.styles';
import { useTheme, useStyles } from '../../../../shared/context';
import { icon } from '../../../../shared/theme';
import { IconButton } from '../../../../shared/components/icon-button';

interface Props {
  seriesName: string;
  chapterTitle: string;
  // undefined when the book has a single page — nothing worth showing.
  pageIndicatorText?: string;
  onBack: () => void;
  backLabel: string;
  visible: boolean;
}

// Dumb: renders the series name, chapter title and optional page indicator it is given, and fires
// onBack.
export function BookReaderTopBar({ seriesName, chapterTitle, pageIndicatorText, onBack, backLabel, visible }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(bookReaderTopBarStyles);
  if (!visible) {return null;}

  return (
    <View style={styles.root} testID="book-reader-top-bar">
      <IconButton
        icon={ChevronLeft}
        glyph="chevron"
        size={icon.size[9]}
        color={colors.icon.primary}
        onPress={onBack}
        accessibilityLabel={backLabel}
        style={styles.backButton}
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
