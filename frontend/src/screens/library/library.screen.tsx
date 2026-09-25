import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowDownAZ, ClockArrowDown, LayoutGrid, LayoutList, ListFilter } from 'lucide-react-native';
import { ScrollToTopButton } from '../../shared/components/scroll-to-top-button';
import { IconButton } from '../../shared/components/icon-button';
import { useStrings } from '../../shared/i18n';
import type { Strings } from '../../shared/i18n';
import { NavOrigin, Routes } from '../../navigation/routes';
import { SerieTool } from '../../shared/tools/serials';
import { DateTool } from '../../shared/tools/date';
import { LibraryTool, type LibraryEntry } from './library.tool';
import { Card, CardList } from '../../shared/components';
import { AlphabetIndex, LibraryFilterMenu } from './components';
import { FreshnessBanner } from '../../shared/components';
import type { FreshnessBannerVariant } from '../../shared/components';
import { useLibrary, type LibraryBannerState } from './hooks';
import { libraryStyles } from './library.styles';
import type { LibraryMode, LibraryReadStatusFilter } from './library.types';
import { useTheme, useStyles } from '../../shared/context';
import { icon } from '../../shared/theme';

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
  const { colors } = useTheme();
  const styles = useStyles(libraryStyles);
  const t = useStrings();
  const route = useRoute();
  const mode = resolveMode((route.params as { mode?: string } | undefined)?.mode);
  const isFollowing = mode === 'following';

  // Session-only, resets on unmount (leaving the tab) — see LibraryReadStatusFilter's own doc.
  const [activeReadStatusFilters, setActiveReadStatusFilters] = useState<Set<LibraryReadStatusFilter>>(
    () => new Set(),
  );
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);

  // Composes with the following-only filter (isFollowed) rather than replacing it — both narrow
  // the same list independently. Adding a future filter (e.g. publication status) is another
  // `&&` clause here, not a rewrite of this shape.
  const filter = useMemo(
    () => (entry: LibraryEntry) =>
      (!isFollowing || entry.isFollowed) && LibraryTool.matchesReadStatus(entry, activeReadStatusFilters),
    [isFollowing, activeReadStatusFilters],
  );

  const {
    loading,
    refreshing,
    error,
    bannerState,
    data,
    unfilteredCount,
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

  // No position measurement needed — the filter sheet spans the screen's own width (a bottom
  // sheet, not a small popover anchored under the button), so there's no per-button coordinate to
  // get wrong. This also sidesteps a device bug the previous popover had: measuring the button's
  // on-screen position inside its own onPress could race the native touch-feedback pass and read
  // a stale/zeroed layout, landing the popover at the screen's left edge instead of under it.
  const openFilterMenu = useCallback(() => setFilterMenuVisible(true), []);

  const toggleReadStatusFilter = useCallback((value: LibraryReadStatusFilter) => {
    setActiveReadStatusFilters(current => {
      const next = new Set(current);
      if (next.has(value)) {next.delete(value);}
      else {next.add(value);}
      return next;
    });
  }, []);

  const clearReadStatusFilters = useCallback(() => setActiveReadStatusFilters(new Set()), []);

  const renderGridItem = useCallback(
    ({ item }: { item: LibraryEntry | null }) =>
      item ? (
        <Card {...item} onToggleFollow={toggleFollow} onPress={openSeries} />
      ) : (
        <View style={styles.cardPlaceholder} />
      ),
    [toggleFollow, openSeries, styles.cardPlaceholder],
  );

  const renderListItem = useCallback(
    ({ item }: { item: LibraryEntry }) => (
      <CardList {...item} onToggleFollow={toggleFollow} onPress={openSeries} />
    ),
    [toggleFollow, openSeries],
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
        <ActivityIndicator size="large" color={colors.icon.button.secondary} />
        <Text style={styles.message}>{t.libraryLoading}</Text>
      </View>
    );
  }

  if (error && data.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t.libraryError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryText}>{t.libraryRetry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!loading && unfilteredCount === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{emptyText}</Text>
      </View>
    );
  }

  // Distinct from the empty-library case above: there IS data, a filter just matched nothing —
  // the topBar (and the filter button in it) stays reachable so the user can change/clear it,
  // unlike the true-empty state, which renders nothing else.
  const filterMatchedNothing = !loading && data.length === 0;

  const alphabetEntries = Array.from(alphabetIndex.entries());
  const banner = freshnessBanner(bannerState, t);

  const sortLabel = sortMode === 'RECENTLY_UPDATED' ? t.librarySortRecentlyUpdated : t.librarySortAlphabetical;
  // Describes where the toggle takes you, not the current mode — same convention as sortLabel.
  const viewToggleLabel = viewMode === 'GRID' ? t.libraryViewList : t.libraryViewGrid;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.countTxt}>
          {data.length} {t.librarySeriesCount}
        </Text>
        <IconButton
          icon={ListFilter}
          glyph="arrow"
          size={icon.size[5]}
          color={activeReadStatusFilters.size > 0 ? colors.icon.primary : colors.icon.secondary}
          onPress={openFilterMenu}
          accessibilityLabel={t.libraryFilterButtonLabel}
        />
        <IconButton
          icon={sortMode === 'RECENTLY_UPDATED' ? ClockArrowDown : ArrowDownAZ}
          glyph="arrow"
          size={icon.size[5]}
          color={colors.text.link.primary}
          onPress={toggleSortMode}
          accessibilityLabel={sortLabel}
          style={styles.sortBtn}
        />
        <IconButton
          icon={viewMode === 'GRID' ? LayoutList : LayoutGrid}
          glyph="arrow"
          size={icon.size[4]}
          color={colors.icon.secondary}
          onPress={toggleViewMode}
          accessibilityLabel={viewToggleLabel}
          style={styles.viewToggleBtn}
        />
      </View>

      <LibraryFilterMenu
        visible={filterMenuVisible}
        active={activeReadStatusFilters}
        t={t}
        onClose={() => setFilterMenuVisible(false)}
        onToggle={toggleReadStatusFilter}
        onClear={clearReadStatusFilters}
      />

      {filterMatchedNothing ? (
        <View style={styles.center}>
          <Text style={styles.message}>{t.libraryFilterNoResults}</Text>
        </View>
      ) : (
        <>
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
                  // `tintColor` is iOS-only; Android draws the spinner with `colors`, so both are set.
                  tintColor={colors.icon.primary}
                  colors={[colors.icon.primary]}
                  progressBackgroundColor={colors.surface.secondary}
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
                accessibilityLabel={t.commonScrollToTopLabel}
              />
            )}
          </View>
        </>
      )}
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
