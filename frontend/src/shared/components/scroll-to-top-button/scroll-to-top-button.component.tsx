import React from 'react';
import { ChevronUp } from 'lucide-react-native';

import { scrollToTopButtonStyles } from './scroll-to-top-button.styles';
import { useTheme } from '../../context';
import { useStyles } from '../../context';
import { IconButton } from '../icon-button';

// Floating "back to top" button. Dumb — the parent decides when to show it and what onPress does
// (usually scrollToOffset(0) + hide). `right` lets a caller nudge it clear of another overlay.
export interface ScrollToTopButtonProps {
  onPress: () => void;
  right?: number;
  accessibilityLabel: string;
}

const ICON_SIZE = 22;

export function ScrollToTopButton({ onPress, right = 16, accessibilityLabel }: ScrollToTopButtonProps) {
  const { colors } = useTheme();
  const styles = useStyles(scrollToTopButtonStyles);
  return (
    <IconButton
      icon={ChevronUp}
      glyph="chevron"
      size={ICON_SIZE}
      color={colors.icon.button.primary}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={[styles.button, { right }]}
    />
  );
}
