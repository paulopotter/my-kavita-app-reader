import React from 'react';
import { View } from 'react-native';
import { AArrowDown, AArrowUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Palette } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { bookReaderFooterStyles } from './book-reader-footer.styles';
import { useBottomInset, useTheme, useStyles } from '../../../../shared/context';
import { icon, spacing } from '../../../../shared/theme';
import { IconButton } from '../../../../shared/components/icon-button';
import type { GlyphName } from '../../../../shared/components/icon-button/icon-button.glyphs';

export interface BookReaderFooterLabels {
  prevChapter: string;
  nextChapter: string;
  prevPage: string;
  nextPage: string;
  smallerText: string;
  largerText: string;
  appearance: string;
}

interface Props {
  visible: boolean;
  labels: BookReaderFooterLabels;
  hasPrevChapter: boolean;
  hasNextChapter: boolean;
  // Page buttons only exist for a book with more than one page.
  showPages: boolean;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onSmallerText: () => void;
  onLargerText: () => void;
  onOpenAppearance: () => void;
}

// Dumb: a row of controls, each one enabled or not as it is told. Nothing here knows what a
// chapter or a page is.
export function BookReaderFooter({
  visible,
  labels,
  hasPrevChapter,
  hasNextChapter,
  showPages,
  hasPrevPage,
  hasNextPage,
  onPrevChapter,
  onNextChapter,
  onPrevPage,
  onNextPage,
  onSmallerText,
  onLargerText,
  onOpenAppearance,
}: Props) {
  const { colors } = useTheme();
  const styles = useStyles(bookReaderFooterStyles);
  const bottomInset = useBottomInset();
  if (!visible) {return null;}

  const button = ({
    glyph,
    Icon,
    label,
    enabled,
    onPress,
  }: {
    glyph: GlyphName;
    Icon: LucideIcon;
    label: string;
    enabled: boolean;
    onPress: () => void;
  }) => (
    <IconButton
      icon={Icon}
      glyph={glyph}
      size={icon.size[10]}
      color={enabled ? colors.icon.primary : colors.icon.tertiary}
      onPress={enabled ? onPress : undefined}
      accessibilityLabel={label}
    />
  );

  return (
    <View style={[styles.root, { paddingBottom: spacing[7] + bottomInset }]} testID="book-reader-footer">
      <View style={styles.side}>
        {button({ glyph: 'chevron', Icon: ChevronsLeft, label: labels.prevChapter, enabled: hasPrevChapter, onPress: onPrevChapter })}
        {showPages &&
          button({ glyph: 'chevron', Icon: ChevronLeft, label: labels.prevPage, enabled: hasPrevPage, onPress: onPrevPage })}
      </View>
      <View style={styles.center}>
        {button({ glyph: 'arrow', Icon: AArrowDown, label: labels.smallerText, enabled: true, onPress: onSmallerText })}
        {button({ glyph: 'arrow', Icon: AArrowUp, label: labels.largerText, enabled: true, onPress: onLargerText })}
        {button({ glyph: 'circle', Icon: Palette, label: labels.appearance, enabled: true, onPress: onOpenAppearance })}
      </View>
      <View style={[styles.side, styles.sideEnd]}>
        {showPages &&
          button({ glyph: 'chevron', Icon: ChevronRight, label: labels.nextPage, enabled: hasNextPage, onPress: onNextPage })}
        {button({ glyph: 'chevron', Icon: ChevronsRight, label: labels.nextChapter, enabled: hasNextChapter, onPress: onNextChapter })}
      </View>
    </View>
  );
}
