import React from 'react';
import { Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { bookReaderTopBarStyles } from './book-reader-top-bar.styles';
import { useTheme, useStyles } from '../../../../shared/context';
import { icon } from '../../../../shared/theme';
import { IconButton } from '../../../../shared/components/icon-button';

interface Props {
  seriesName: string;
  // undefined when the book has a single page — nothing worth showing.
  pageIndicatorText?: string;
  onBack: () => void;
  backLabel: string;
  visible: boolean;
}

// Dumb: the back button, the series name and, for a book with several pages, which page this is.
// The chapter's own title is deliberately not here — the page already opens with it.
export function BookReaderTopBar({ seriesName, pageIndicatorText, onBack, backLabel, visible }: Props) {
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
      <Text style={styles.seriesName} numberOfLines={1}>
        {seriesName}
      </Text>
      {pageIndicatorText != null && (
        <Text style={styles.pageIndicator} numberOfLines={1}>
          {pageIndicatorText}
        </Text>
      )}
    </View>
  );
}
