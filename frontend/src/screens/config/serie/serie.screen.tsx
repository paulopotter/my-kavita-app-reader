import React from 'react';
import { ScrollView, Text, View } from 'react-native';
// Config deliberately reaches into the screen it configures — ChapterSortFields is the exact same
// fields the SerieScreen sort modal shows, only the save scope differs (global here, per-series
// there). It lives in screens/serie/, not shared/, because config + that one screen are its only
// callers; promote it to shared/ if a third screen ever needs it.
import { ChapterSortFields } from '../../../screens/serie/components/chapter-sort';
import { useStrings } from '../../../shared/i18n';
import { styles as chrome } from '../config.styles';
import { useSerieSort } from './serie.hooks';

// Global chapter-sort settings. Folder named after the real series screen (screens/serie/) — this
// is that screen's config, scoped inside screens/config/.
export function SerieSortScreen({ onBack }: { onBack: () => void }) {
  const t = useStrings();
  const { loading, mode, fixedThreshold, progressPercent, change } = useSerieSort();

  return (
    <View style={chrome.root}>
      <View style={chrome.subHeader}>
        <Text onPress={onBack} style={chrome.backChevron} suppressHighlighting>
          ‹
        </Text>
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
