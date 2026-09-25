import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { readerSideProgressBarStyles } from './reader-side-progress-bar.styles';
import { useTheme, useStyles } from '../../../../shared/context';
import { icon } from '../../../../shared/theme';
import { IconButton } from '../../../../shared/components/icon-button';

interface Props {
  totalPages: number;
  currentPage: number;
  onPageSelect: (index: number) => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  prevChapterLabel: string;
  nextChapterLabel: string;
  visible: boolean;
}

// Dumb: renders arrows + one dot per page from the props it's given; fires the callbacks.
export function ReaderSideProgressBar({
  totalPages,
  currentPage,
  onPageSelect,
  onPrevChapter,
  onNextChapter,
  hasPrev,
  hasNext,
  prevChapterLabel,
  nextChapterLabel,
  visible,
}: Props) {
  const { colors } = useTheme();
  const styles = useStyles(readerSideProgressBarStyles);
  if (!visible) {return null;}

  return (
    <View style={styles.root}>
      <IconButton
        icon={ChevronUp}
        glyph="chevron"
        size={icon.size[4]}
        color={hasPrev ? colors.icon.primary : colors.icon.tertiary}
        onPress={() => {
          if (hasPrev) {onPrevChapter();}
        }}
        accessibilityLabel={prevChapterLabel}
        style={styles.arrowButton}
      />
      <View style={styles.dots}>
        {Array.from({ length: totalPages }, (_, index) => (
          <TouchableOpacity
            key={index}
            style={styles.dotTouchable}
            onPress={() => onPageSelect(index)}
            hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}>
            <View
              style={[
                styles.dot,
                index < currentPage && styles.dotRead,
                index === currentPage && styles.dotActive,
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
      <IconButton
        icon={ChevronDown}
        glyph="chevron"
        size={icon.size[4]}
        color={hasNext ? colors.icon.primary : colors.icon.tertiary}
        onPress={() => {
          if (hasNext) {onNextChapter();}
        }}
        accessibilityLabel={nextChapterLabel}
        style={styles.arrowButton}
      />
    </View>
  );
}
