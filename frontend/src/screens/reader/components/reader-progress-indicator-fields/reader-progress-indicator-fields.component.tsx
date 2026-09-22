import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { readerProgressIndicatorFieldsStyles } from './reader-progress-indicator-fields.styles';
import { useTheme, useStyles } from '../../../../shared/context';
import { themes, type ThemeName } from '../../../../shared/theme';
import { ThemeLabelsTool } from '../../../../shared/tools/theme-labels';
import type { ProgressBarPosition } from '../../../../shared/tools/reader';
import type { Strings } from '../../../../shared/i18n';

export interface ReaderProgressIndicatorFieldsProps {
  t: Strings;
  position: ProgressBarPosition | undefined;
  onChangePosition: (position: ProgressBarPosition) => void;
}

const POSITIONS: { value: ProgressBarPosition; label: (t: Strings) => string }[] = [
  { value: 'left', label: t => t.readerProgressPositionLeft },
  { value: 'right', label: t => t.readerProgressPositionRight },
  { value: 'top', label: t => t.readerProgressPositionTop },
  { value: 'bottom', label: t => t.readerProgressPositionBottom },
];

// The reading-progress indicator's own colour (ThemeProvider's progressColorOverride) and edge
// position (ReaderPrefs.progressBarPosition) — the exact same fields, rendered identically,
// wherever the user can reach them: the reader's own overlay settings modal and Ajustes >
// Reading. Lives here (not shared/) because Reader and the Config screen that configures it are
// its only two callers — same precedent as ChapterSortFields living in screens/serie/ while
// screens/config/serials/ imports it directly. Promote to shared/ only if a third screen needs
// it. Neither screen owns the DECISION here, both just mount it and hand it the position value +
// change callback (colour comes straight from useTheme(), already global by nature).
export function ReaderProgressIndicatorFields({ t, position, onChangePosition }: ReaderProgressIndicatorFieldsProps) {
  const { colors, available, progressColorOverride, setProgressColorOverride } = useTheme();
  const styles = useStyles(readerProgressIndicatorFieldsStyles);

  // "Theme default" first, then every non-OLED identity — one row per option, dot + name, same
  // shape as the theme Select's own option rows (config.screen.tsx).
  const colorOptions: { key: string; dotColor: string; label: string; selected: boolean; onPress: () => void }[] = [
    {
      key: '__default__',
      dotColor: colors.progress.reading.primary,
      label: t.readerProgressColorDefault,
      selected: !progressColorOverride,
      onPress: () => setProgressColorOverride(undefined),
    },
    ...available
      .filter((name): name is ThemeName => !name.endsWith('Oled'))
      .map(name => ({
        key: name,
        dotColor: themes[name].progress.reading.primary,
        label: ThemeLabelsTool.labelOf(name, t),
        selected: progressColorOverride === name,
        onPress: () => setProgressColorOverride(name),
      })),
  ];

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t.readerProgressColorLabel}</Text>
        <View style={styles.colorList}>
          {colorOptions.map((option, index) => (
            <View key={option.key}>
              {index > 0 && <View style={styles.colorDivider} />}
              <Pressable
                style={[styles.colorRow, option.selected && styles.colorRowActive]}
                onPress={option.onPress}
                accessibilityRole="button">
                <View style={[styles.colorDot, { backgroundColor: option.dotColor }]} />
                <Text style={[styles.colorRowText, option.selected && styles.colorRowTextActive]} numberOfLines={1}>
                  {option.label}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t.readerProgressPositionLabel}</Text>
        <View style={styles.positionGrid}>
          {POSITIONS.map(({ value, label }) => {
            const selected = position === value;
            return (
              <Pressable
                key={value}
                style={[styles.positionOption, selected && styles.positionOptionSelected]}
                onPress={() => onChangePosition(value)}>
                <Text style={[styles.positionOptionText, selected && styles.positionOptionTextSelected]}>{label(t)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}
