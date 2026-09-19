import React from 'react';
import { TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '../../../../shared/theme';
import { styles } from './back-chevron.styles';

export interface BackChevronProps {
  onPress?: () => void;
}

// The "‹ back" affordance every config sub-screen's own subHeader renders before its title —
// shared here instead of each screen repeating the same JSX/style (was a bare <Text>'…'</Text>).
export function BackChevron({ onPress }: BackChevronProps) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.hitArea} accessibilityRole="button">
      <ChevronLeft size={28} color={colors.icon.button.secondary} />
    </TouchableOpacity>
  );
}
