import React from 'react';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../../../shared/context';
import { IconButton } from '../../../../shared/components/icon-button';
import { icon } from '../../../../shared/theme';

export interface BackChevronProps {
  onPress?: () => void;
}

// The "back" affordance every config sub-screen's subHeader renders before its title. alignStroke
// is what keeps the chevron's stroke on the same line as the title and the content below it.
export function BackChevron({ onPress }: BackChevronProps) {
  const { colors } = useTheme();
  return (
    <IconButton
      icon={ChevronLeft}
      glyph="chevron"
      size={icon.size[9]}
      color={colors.icon.button.secondary}
      onPress={onPress}
      alignStroke
    />
  );
}
