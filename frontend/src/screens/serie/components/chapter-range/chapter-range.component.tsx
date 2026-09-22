import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { Strings } from '../../../../shared/i18n';
import { chapterRangeStyles } from './chapter-range.styles';
import { ColorTool } from '../../../../shared/theme';
import { useTheme, useStyles } from '../../../../shared/context';

// Sanitizes a chapter-number field's raw text into a finite number, or undefined when it isn't
// one yet (empty, or still mid-edit like "12.") — same free-text-to-number shape chapter-sort's
// own fields use, since a chapter number can be decimal (5.5).
function parseChapterNumber(text: string): number | undefined {
  const parsed = parseFloat(text);
  return isNaN(parsed) ? undefined : parsed;
}

// Two free-text inputs ("from" / "to"), each accepting a chapter number (integer or decimal).
// Dumb — holds only its own transient text state and reports the parsed range via onChange;
// SerieScreen decides what a valid range does (feeds it to selectRange, entering selection mode
// so the user reviews the result before marking it read).
export interface ChapterRangeFieldsProps {
  t: Strings;
  onChange: (from: number | undefined, to: number | undefined) => void;
}

export function ChapterRangeFields({ t, onChange }: ChapterRangeFieldsProps) {
  const { colors } = useTheme();
  const styles = useStyles(chapterRangeStyles);
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');

  function handleFromChange(text: string) {
    const sanitized = text.replace(/[^0-9.]/g, '');
    setFromText(sanitized);
    onChange(parseChapterNumber(sanitized), parseChapterNumber(toText));
  }

  function handleToChange(text: string) {
    const sanitized = text.replace(/[^0-9.]/g, '');
    setToText(sanitized);
    onChange(parseChapterNumber(fromText), parseChapterNumber(sanitized));
  }

  const placeholderColor = ColorTool.add.alpha(colors.text.input.placeholder, 0.4);

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t.seriesDetailRangeFromLabel}</Text>
          <TextInput
            style={styles.input}
            value={fromText}
            onChangeText={handleFromChange}
            keyboardType="numeric"
            placeholderTextColor={placeholderColor}
            autoFocus
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t.seriesDetailRangeToLabel}</Text>
          <TextInput
            style={styles.input}
            value={toText}
            onChangeText={handleToChange}
            keyboardType="numeric"
            placeholderTextColor={placeholderColor}
          />
        </View>
      </View>
    </View>
  );
}
