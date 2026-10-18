import React from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { bookReaderSettingsSheetStyles } from './book-reader-settings-sheet.styles';
import { useStyles, useTheme } from '../../../../shared/context';
import type { Strings } from '../../../../shared/i18n';
import { READING_THEME_NAMES } from '../../../../shared/theme';
import type { ReadingThemeName, ThemeColors } from '../../../../shared/theme';
import { BOOK_FONT_FAMILIES, BOOK_LINE_SPACINGS, BOOK_MARGINS, BookThemeTool } from '../../../../shared/tools/books';
import type { BookAppearance, BookFontFamily, BookMargin } from '../../../../shared/tools/books';

interface Props {
  visible: boolean;
  appearance: BookAppearance;
  t: Strings;
  onChange: <K extends keyof BookAppearance>(key: K, value: BookAppearance[K]) => void;
  onClose: () => void;
}

const fontLabel = (family: BookFontFamily, t: Strings): string =>
  family === 'serif' ? t.bookReaderFontSerif : family === 'sans' ? t.bookReaderFontSans : t.bookReaderFontMono;

const marginLabel = (margin: BookMargin, t: Strings): string =>
  margin === 'narrow' ? t.bookReaderMarginNarrow : margin === 'medium' ? t.bookReaderMarginMedium : t.bookReaderMarginWide;

// Dumb: shows the reader's choices and reports each change. What a choice does to the page is the
// document's job; where it is saved is the hook's.
export function BookReaderSettingsSheet({ visible, appearance, t, onChange, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(bookReaderSettingsSheetStyles);

  const chip = ({ key, label, selected, onPress }: { key: string; label: string; selected: boolean; onPress: () => void }) => (
    <Pressable
      key={key}
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );

  const swatch = (name: ReadingThemeName, appColors: ThemeColors) => {
    const palette = BookThemeTool.colors({ theme: name, appColors });
    const selected = appearance.theme === name;
    return (
      <Pressable
        key={name}
        style={[styles.swatch, { backgroundColor: palette.background }, selected && styles.swatchSelected]}
        onPress={() => onChange('theme', name)}
        accessibilityRole="button"
        accessibilityLabel={BookThemeTool.labelOf(name, t)}
        accessibilityState={{ selected }}>
        <Text style={[styles.swatchSample, { color: palette.text }]}>Aa</Text>
        <Text style={[styles.swatchLabel, { color: palette.text }]} numberOfLines={1}>
          {BookThemeTool.labelOf(name, t)}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="book-reader-settings-backdrop">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{t.bookReaderAppearance}</Text>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t.bookReaderThemeLabel}</Text>
              <View style={styles.row}>{READING_THEME_NAMES.map(name => swatch(name, colors))}</View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t.bookReaderFontLabel}</Text>
              <View style={styles.row}>
                {BOOK_FONT_FAMILIES.map(family =>
                  chip({
                    key: family,
                    label: fontLabel(family, t),
                    selected: appearance.fontFamily === family,
                    onPress: () => onChange('fontFamily', family),
                  }),
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t.bookReaderLineSpacingLabel}</Text>
              <View style={styles.row}>
                {BOOK_LINE_SPACINGS.map(height =>
                  chip({
                    key: String(height),
                    label: String(height),
                    selected: appearance.lineSpacing === height,
                    onPress: () => onChange('lineSpacing', height),
                  }),
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t.bookReaderMarginLabel}</Text>
              <View style={styles.row}>
                {BOOK_MARGINS.map(margin =>
                  chip({
                    key: margin,
                    label: marginLabel(margin, t),
                    selected: appearance.margin === margin,
                    onPress: () => onChange('margin', margin),
                  }),
                )}
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t.bookReaderJustify}</Text>
              <Switch
                value={appearance.justify}
                onValueChange={value => onChange('justify', value)}
                thumbColor={appearance.justify ? colors.button.switch.thumb.on : colors.button.switch.thumb.off}
                trackColor={{ false: colors.button.switch.track.off, true: colors.button.switch.track.on }}
              />
            </View>
          </ScrollView>

          <Pressable style={styles.closeButton} onPress={onClose} accessibilityRole="button">
            <Text style={styles.closeText}>{t.bookReaderClose}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
