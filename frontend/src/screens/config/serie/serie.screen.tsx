import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
// Config deliberately reaches into the screen it configures — ChapterSortFields is the exact same
// fields the SerieScreen sort modal shows, only the save scope differs (global here, per-series
// there). It lives in screens/serie/, not shared/, because config + that one screen are its only
// callers; promote it to shared/ if a third screen ever needs it.
import { ChapterSortFields } from '../../../screens/serie/components/chapter-sort';
import { useStrings } from '../../../shared/i18n';
import { BackChevron } from '../components';
import { makeStyles as makeChrome } from '../config.styles';
import { useSerieSort } from './serie.hooks';
import { useTheme } from '../../../shared/theme';

// Global chapter-sort settings. Folder named after the real series screen (screens/serie/) — this
// is that screen's config, scoped inside screens/config/.
export function SerieSortScreen({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  const chrome = useMemo(() => makeChrome(colors), [colors]);
  const t = useStrings();
  const { loading, mode, fixedThreshold, progressPercent, change } = useSerieSort();

  return (
    <View style={chrome.root}>
      <View style={chrome.subHeader}>
        <BackChevron onPress={onBack} />
        <Text style={chrome.subTitle}>{t.configMenuChapter}</Text>
      </View>

      {!loading && (
        <ScrollView contentContainerStyle={chrome.scroll}>
          <Text style={chrome.section}>{t.configChapterSortGroupTitle}</Text>
          <ChapterSortFields
            mode={mode}
            fixedThreshold={fixedThreshold}
            progressPercent={progressPercent}
            t={t}
            onChange={change}
          />
        </ScrollView>
      )}
    </View>
  );
}
