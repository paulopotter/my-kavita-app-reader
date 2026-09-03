import React, { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollToTopButton } from '../../shared/components/scroll-to-top-button';
import { useStrings } from '../../shared/i18n/useStrings';
import type { Strings } from '../../shared/i18n/strings';
import { NavOrigin, Routes } from '../../navigation/routes';
import { SerieTool } from '../../shared/tools/series';
import { DateTool } from '../../shared/tools/date';
import { LibraryTool, type LibraryEntry } from './library.tool';
import { AlphabetIndex, FreshnessBanner, SeriesCard, SeriesListItem } from './components';
import type { FreshnessBannerVariant } from './components';
import { useLibrary, type LibraryBannerState } from './hooks';
import { styles } from './library.styles';
import type { LibraryMode } from './library.types';

// The same screen backs two tabs. Which one is driven entirely by the route param `mode` (set via
// Tab.Screen's initialParams in MainNavigator) — there is no separate Following screen. 'following'
// = the Library list filtered to followed series, with its own persisted layout prefs and its own
// nav origin; 'library' (the default when the param is absent) = everything.
function resolveMode(raw: unknown): LibraryMode {
  return raw === 'following' ? 'following' : 'library';
}

// library.screen.tsx — render + event forwarding only. Every piece of derived state
// (alphabetIndex, padded list, scroll-to-top visibility, sort/view mode) comes from useLibrary;
// the only thing the screen owns is navigation and the FlatList ref.
export function LibraryScreen() {
  const t = useStrings();
  const route = useRoute();
  const mode = resolveMode((route.params as { mode?: string } | undefined)?.mode);
  const isFollowing = mode === 'following';

  const filter = useMemo(
    () => (isFollowing ? (entry: LibraryEntry) => entry.isFollowed : undefined),
    [isFollowing],
  );

  const {
    loading,
    refreshing,
    error,
    bannerState,
    data,
    paddedData,
    viewMode,
    sortMode,
    alphabetIndex,
    showScrollTop,
    hideScrollTop,
    handleScroll,
    onViewableIndices,
    refresh,
    toggleSortMode,
    toggleViewMode,
  } = useLibrary({ filter, prefsKey: mode });

  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const listRef = useRef<FlatList>(null);
  const origin: NavOrigin = isFollowing ? 'FOLLOWING' : 'LIBRARY';
  const emptyText = isFollowing ? t.followingEmpty : t.libraryEmpty;

  const openSeries = useCallback(
    (seriesId: string) => {
      navigation.navigate(Routes.SERIES_DETAIL, { seriesId, origin });
    },
    [navigation, origin],
  );

  // toggleFollow moves through SerieTool → FollowedSeriesBridge (its optimistic/confirm/revert
  // and the SeriesFollowedEmitter round trip). The hook picks up the resulting followed-ids
  // event and re-derives isFollowed for every card, so the screen just fires and forgets.
  const toggleFollow = useCallback((seriesId: string) => {
    SerieTool.toggleFollow({ seriesId });
  }, []);

  const renderGridItem = useCallback(
    ({ item }: { item: LibraryEntry | null }) =>
      item ? (
        <SeriesCard {...cardProps(item, t)} onToggleFollow={toggleFollow} onPress={openSeries} />
      ) : (
        <View style={styles.cardPlaceholder} />
      ),
    [t, toggleFollow, openSeries],
  );

  const renderListItem = useCallback(
    ({ item }: { item: LibraryEntry }) => (
      <SeriesListItem {...listItemProps(item, t)} onToggleFollow={toggleFollow} onPress={openSeries} />
    ),
    [t, toggleFollow, openSeries],
  );

  const keyExtractor = useCallback((item: LibraryEntry | null, idx: number) => (item ? item.id : `pad-${idx}`), []);

  // Feed the hook the visible index range so it can lazily enrich those cards (+ a lookahead).
  // A low area threshold + no min-view-time so a fast flick still triggers the fetches.
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 1, minimumViewTime: 0 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const idx = viewableItems.map(v => v.index).filter((n): n is number => n != null);
      if (idx.length === 0) { return; }
      onViewableIndices(Math.min(...idx), Math.max(...idx));
    },
  ).current;

  // The alphabet rail calls scrollToIndex on a letter tap. Rows have no fixed height (no
  // getItemLayout), so a jump to a still-unrendered index throws "Invariant Violation:
  // scrollToIndex should be used in conjunction with getItemLayout or onScrollToIndexFailed".
  // This is that fallback: nudge toward the target by an estimated offset, let FlatList render,
  // then land the exact index on the next frame.
  const onScrollToIndexFailed = useCallback((info: { index: number; averageItemLength: number }) => {
    listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: info.index, animated: false });
    }, 60);
  }, []);

  if (loading && data.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E94560" />
        <Text style={styles.message}>{t.libraryLoading}</Text>
      </View>
    );
  }

  if (error && data.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t.libraryError}</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryText}>{t.libraryRetry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!loading && data.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{emptyText}</Text>
      </View>
    );
  }

  const alphabetEntries = Array.from(alphabetIndex.entries());
  const banner = freshnessBanner(bannerState, t);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.countTxt}>
          {data.length} {t.librarySeriesCount}
        </Text>
        <TouchableOpacity style={styles.sortBtn} onPress={toggleSortMode}>
          <Text style={styles.sortBtnTxt}>
            {sortMode === 'RECENTLY_UPDATED' ? t.librarySortRecentlyUpdated : t.librarySortAlphabetical}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.viewToggleBtn} onPress={toggleViewMode}>
          <Text style={styles.viewToggleIcon}>{viewMode === 'GRID' ? '☰' : '⊞'}</Text>
        </TouchableOpacity>
      </View>

      {banner && <FreshnessBanner variant={banner.variant} text={banner.text} />}

      <View style={styles.content}>
        <FlatList
          ref={listRef}
          data={paddedData as (LibraryEntry | null)[]}
          keyExtractor={keyExtractor as (item: LibraryEntry | null, idx: number) => string}
          numColumns={viewMode === 'GRID' ? 2 : 1}
          key={viewMode}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#E94560"
              progressBackgroundColor="rgba(22,33,62,0.85)"
            />
          }
          renderItem={viewMode === 'GRID' ? renderGridItem : (renderListItem as never)}
          contentContainerStyle={
            viewMode === 'GRID'
              ? styles.gridList
              : alphabetEntries.length > 0
                ? styles.listListWithIndex
                : styles.listList
          }
          onScroll={handleScroll}
          scrollEventThrottle={100}
          onScrollToIndexFailed={onScrollToIndexFailed}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          // A re-order re-mounts nothing (stable keys) and the rows are React.memo'd, so the cost
          // is FlatList diffing 119 items. These caps keep the work per frame bounded.
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
          removeClippedSubviews
        />

        <AlphabetIndex
          entries={alphabetEntries}
          onJump={idx => listRef.current?.scrollToIndex({ index: idx, animated: false })}
        />

        {showScrollTop && (
          <ScrollToTopButton
            right={36}
            onPress={() => {
              listRef.current?.scrollToOffset({ offset: 0, animated: true });
              hideScrollTop();
            }}
          />
        )}
      </View>
    </View>
  );
}

// ── freshness banner (pure, screen-local — maps the hook's bannerState to a variant + string) ──

function freshnessBanner(
  state: LibraryBannerState,
  t: Strings,
): { variant: FreshnessBannerVariant; text: string } | null {
  switch (state.kind) {
    case 'none':
      return null;
    case 'confirmed':
      return { variant: 'confirmed', text: t.libraryUpdatedAt.replace('{0}', DateTool.format.to.time(state.atEpochMs)) };
    case 'stale':
      return {
        variant: 'stale',
        text: t.libraryUpdatedAgo.replace('{0}', DateTool.format.to.relative(state.sinceEpochMs, t)),
      };
    case 'offline':
      return state.sinceEpochMs == null
        ? { variant: 'offline', text: t.libraryOfflineNoDate }
        : {
            variant: 'offline',
            text: t.libraryOfflineStale.replace('{0}', DateTool.format.to.relative(state.sinceEpochMs, t)),
          };
  }
}

// ── label assembly (pure, screen-local — the dumb components take strings only) ──────────────

function chapterCountLabel(entry: LibraryEntry, t: Strings): string | undefined {
  if (entry.readChapters == null || entry.chapterCount == null) {
    return undefined;
  }
  return `${entry.readChapters}/${entry.chapterCount} ${t.chaptersFormat}`;
}

function downloadedLabel(entry: LibraryEntry, t: Strings): string | undefined {
  if (entry.downloadedChapters == null || entry.totalChapters == null) {
    return undefined;
  }
  return `${entry.downloadedChapters}/${entry.totalChapters} ${t.chaptersFormat}`;
}

function cardProps(entry: LibraryEntry, t: Strings) {
  return {
    id: entry.id,
    name: entry.name,
    coverUrl: entry.coverUrl,
    progressFraction: entry.progressFraction,
    progressLabel: LibraryTool.label.progressPercent(entry.progressFraction),
    chapterCountLabel: chapterCountLabel(entry, t),
    downloadedLabel: downloadedLabel(entry, t),
    publicationLabel: entry.publicationStatus ? LibraryTool.label.publication(entry.publicationStatus, t) : undefined,
    errorsLabel: entry.hasErrors ? t.hasErrors : undefined,
    isFollowed: entry.isFollowed,
  };
}

function listItemProps(entry: LibraryEntry, t: Strings) {
  return {
    id: entry.id,
    name: entry.name,
    coverUrl: entry.coverUrl,
    progressFraction: entry.progressFraction,
    progressLabel: LibraryTool.label.progressPercent(entry.progressFraction),
    chapterCountLabel: chapterCountLabel(entry, t),
    downloadedLabel: downloadedLabel(entry, t),
    isFollowed: entry.isFollowed,
  };
}
