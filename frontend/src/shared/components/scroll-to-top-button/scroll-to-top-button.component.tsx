import React, { useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import { ChevronUp } from 'lucide-react-native';

import { makeStyles } from './scroll-to-top-button.styles';
import { useTheme } from '../../theme';

// Floating "back to top" button. Dumb — the parent decides when to show it and what onPress does
// (usually scrollToOffset(0) + hide). `right` lets a caller nudge it clear of another overlay.
export interface ScrollToTopButtonProps {
  onPress: () => void;
  right?: number;
}

const ICON_SIZE = 22;

export function ScrollToTopButton({ onPress, right = 16 }: ScrollToTopButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity style={[styles.button, { right }]} onPress={onPress}>
      <ChevronUp size={ICON_SIZE} color={colors.icon.button.primary} />
    </TouchableOpacity>
  );
}
