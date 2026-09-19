import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { X } from 'lucide-react-native';
import { CardList, ConfirmDialog } from '../../shared/components';
import { useStrings } from '../../shared/i18n';
import type { Strings } from '../../shared/i18n';
import { Routes } from '../../navigation/routes';
import { SerieTool, type SerialCard } from '../../shared/tools/serials';
import { SearchInput } from './components';
import { useSearch } from './hooks';
import { searchStyles } from './search.styles';
import type { SearchHistoryRow } from './search.types';
import { useTheme, useStyles } from '../../shared/context';
import { icon } from '../../shared/theme';

// How many rows matched, as a finished string. One form per count so a language can word the
// singular differently rather than appending an "s".
function resultCountLabel(count: number, t: Strings): string {
  return count === 1 ? t.searchResultCountOne : t.searchResultCount.replace('{0}', String(count));
}

// search.screen.tsx — render + event forwarding only. The catalogue, the matching, the history
// and the delete confirmation all live in useSearch; the screen owns navigation alone.
export function SearchScreen() {
  const { colors } = useTheme();
  const styles = useStyles(searchStyles);
  const t = useStrings();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const {
    query,
    setQuery,
    results,
    history,
    loading,
    error,
    reload,
    recordOpened,
    pendingDelete,
    requestDelete,
    cancelDelete,
    confirmDelete,
  } = useSearch();

  // Opening from Search records the series in the history and navigates with origin SEARCH, so
  // going back returns to this tab rather than falling through to the Library.
  const openSeries = useCallback(
    (seriesId: string) => {
      recordOpened({ seriesId });
      navigation.navigate(Routes.SERIES_DETAIL, { seriesId, origin: 'SEARCH' });
    },
    [navigation, recordOpened],
  );

  const toggleFollow = useCallback((seriesId: string) => {
    SerieTool.toggleFollow({ seriesId });
  }, []);

  const renderResult = useCallback(
    ({ item }: { item: SerialCard }) => (
      <CardList {...item} onToggleFollow={toggleFollow} onPress={openSeries} />
    ),
    [toggleFollow, openSeries],
  );

  // A history row reuses the same card. Name and cover come from what was stored when it was
  // opened, so the row survives the catalogue being unavailable; the progress is filled in from
  // the catalogue when it is there (see useSearch), which is what makes a row here read the same
  // as the Library's.
  const renderHistory = useCallback(
    ({ item }: { item: SearchHistoryRow }) => (
      <View style={styles.historyRow}>
        <View style={styles.historyCard}>
          <CardList
            id={item.seriesId}
            name={item.name}
            coverUrl={item.coverUrl}
            progressFraction={item.progressFraction}
            progressLabel={item.progressLabel}
            chapterCountLabel={item.chapterCountLabel}
            isFollowed={item.isFollowed}
            onToggleFollow={toggleFollow}
            onPress={openSeries}
          />
        </View>
        <TouchableOpacity
          style={styles.historyDelete}
          onPress={() => requestDelete({ seriesId: item.seriesId })}
          accessibilityRole="button"
          accessibilityLabel={t.searchRecentDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={icon.size[4]} color={colors.icon.tertiary} />
        </TouchableOpacity>
      </View>
    ),
    [toggleFollow, openSeries, requestDelete, t, colors.icon.tertiary, styles.historyCard, styles.historyDelete, styles.historyRow],
  );

  const isSearching = query.trim().length > 0;

  return (
    <View style={styles.root}>
      <SearchInput
        value={query}
        placeholder={t.searchPlaceholder}
        clearAccessibilityLabel={t.searchClear}
        onChange={setQuery}
      />

      {body()}

      <ConfirmDialog
        visible={pendingDelete !== null}
        title={t.searchRecentDeleteConfirm}
        cancelLabel={t.searchDeleteCancel}
        confirmLabel={t.searchDeleteConfirm}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </View>
  );

  function body() {
    // A load failure only blocks SEARCHING — the history is stored locally and still renders,
    // so the user can reach a recent series with the catalogue unavailable.
    if (error && isSearching) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>{t.searchError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={reload}>
            <Text style={styles.retryText}>{t.searchRetry}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isSearching) {
      if (loading) {
        return (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.icon.button.secondary} />
            <Text style={styles.message}>{t.searchLoading}</Text>
          </View>
        );
      }
      if (results.length === 0) {
        return (
          <View style={styles.center}>
            <Text style={styles.message}>{t.searchNoResults}</Text>
          </View>
        );
      }
      return (
        <>
          <Text style={styles.resultCount}>{resultCountLabel(results.length, t)}</Text>
          <FlatList
            data={results}
            keyExtractor={item => item.id}
            renderItem={renderResult}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={7}
            removeClippedSubviews
          />
        </>
      );
    }

    if (history.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={styles.message}>{t.searchEmptyHint}</Text>
        </View>
      );
    }

    return (
      <>
        <Text style={styles.sectionTitle}>{t.searchRecentTitle}</Text>
        <FlatList
          data={history}
          keyExtractor={item => item.seriesId}
          renderItem={renderHistory}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      </>
    );
  }
}
