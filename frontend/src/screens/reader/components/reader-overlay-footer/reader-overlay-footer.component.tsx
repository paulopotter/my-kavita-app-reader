import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ListChecks, Settings2 } from 'lucide-react-native';
import { styles } from './reader-overlay-footer.styles';
import { useTheme, useStyles } from '../../../../shared/context';
import { icon } from '../../../../shared/theme';
import type { Strings } from '../../../../shared/i18n';

interface Props {
  visible: boolean;
  t: Strings;
  onSelectChapter: () => void;
  onOpenSettings: () => void;
}

// The overlay's own quick-action row: jump to any chapter, or open reading settings — both
// reachable without leaving the reader. Dumb: fires the callback it's given, decides nothing
// about what pressing them does.
export function ReaderOverlayFooter({ visible, t, onSelectChapter, onOpenSettings }: Props) {
  const { colors } = useTheme();
  const footerStyles = useStyles(styles);
  if (!visible) {return null;}

  return (
    <View testID="reader-overlay-footer" style={footerStyles.root}>
      <TouchableOpacity
        style={footerStyles.button}
        onPress={onSelectChapter}
        accessibilityRole="button"
        accessibilityLabel={t.readerChapterPickerButtonLabel}>
        <ListChecks size={icon.size[6]} color={colors.icon.primary} />
        <Text style={footerStyles.buttonLabel}>{t.readerChapterPickerButtonLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={footerStyles.button}
        onPress={onOpenSettings}
        accessibilityRole="button"
        accessibilityLabel={t.readerSettingsButtonLabel}>
        <Settings2 size={icon.size[6]} color={colors.icon.primary} />
        <Text style={footerStyles.buttonLabel}>{t.readerSettingsButtonLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
