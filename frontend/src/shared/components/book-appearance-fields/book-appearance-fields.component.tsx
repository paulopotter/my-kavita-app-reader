import React from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { bookAppearanceFieldsStyles } from './book-appearance-fields.styles';
import { useStyles, useTheme } from '../../context';
import type { Strings } from '../../i18n';
import { READING_THEME_NAMES } from '../../theme';
import type { ReadingThemeName, ThemeColors } from '../../theme';
import { BOOK_FONT_FAMILIES, BOOK_FONT_SCALES, BOOK_LINE_SPACINGS, BOOK_MARGINS, BOOK_READING_MODES, BookThemeTool } from '../../tools/books';
import type { BookAppearance, BookFontFamily, BookMargin, BookReadingMode } from '../../tools/books';

interface Props {
  appearance: BookAppearance;
  mode: BookReadingMode;
  t: Strings;
  onChangeMode: (mode: BookReadingMode) => void;
  onChange: <K extends keyof BookAppearance>(key: K, value: BookAppearance[K]) => void;
}

const fontLabel = (family: BookFontFamily, t: Strings): string =>
  family === 'serif' ? t.bookReaderFontSerif : family === 'sans' ? t.bookReaderFontSans : t.bookReaderFontMono;

const marginLabel = (margin: BookMargin, t: Strings): string =>
  margin === 'narrow' ? t.bookReaderMarginNarrow : margin === 'medium' ? t.bookReaderMarginMedium : t.bookReaderMarginWide;

const scaleLabel = (scale: number): string => `${Math.round(scale * 100)}%`;

// Dumb: every choice a novel reader can make about how the text looks and reads, each reported as it
// changes. Used by the reader's own sheet and by Settings, so both always offer the same choices.
export function BookAppearanceFields({ appearance, mode, t, onChangeMode, onChange }: Props) {
  const { colors } = useTheme();
  const styles = useStyles(bookAppearanceFieldsStyles);

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
    <View style={styles.fields}>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t.bookReaderModeLabel}</Text>
        <View style={styles.row}>
          {BOOK_READING_MODES.map(option =>
            chip({
              key: option,
              label: option === 'infinite' ? t.bookReaderModeInfinite : t.bookReaderModePaged,
              selected: mode === option,
              onPress: () => onChangeMode(option),
            }),
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t.bookReaderThemeLabel}</Text>
        <View style={styles.row}>{READING_THEME_NAMES.map(name => swatch(name, colors))}</View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t.bookReaderFontSizeLabel}</Text>
        <View style={styles.row}>
          {BOOK_FONT_SCALES.map(scale =>
            chip({
              key: String(scale),
              label: scaleLabel(scale),
              selected: appearance.fontScale === scale,
              onPress: () => onChange('fontScale', scale),
            }),
          )}
        </View>
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
    </View>
  );
}
