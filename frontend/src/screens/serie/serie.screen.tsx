import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Check, Settings2, Shuffle, SquareCheckBig, X } from 'lucide-react-native';
import { Routes } from '../../navigation/routes';
import type { NavOrigin } from '../../navigation/routes';
import type { Strings } from '../../shared/i18n';
import { useStrings } from '../../shared/i18n';
import { FollowStar } from '../../shared/components/follow-star';
import { ScrollToTopButton } from '../../shared/components/scroll-to-top-button';
import { SelectionBottomBar } from '../../shared/components/selection-bottom-bar';
import { FreshnessBanner } from '../../shared/components';
import type { FreshnessBannerVariant } from '../../shared/components';
import { CHAPTER_ROW_HEIGHT, ChapterListItem, ChapterSortFields, Header, sortModeLabel } from './components';
import { useSerie } from './hooks';
import { serieStyles } from './serie.styles';
import type { SerieChapter } from '../../shared';
import { ChapterTool } from '../../shared/tools/chapters';
import type { ChapterSortMode } from './serie.types';
import { useTheme, useStyles } from '../../shared/context';
import { icon } from '../../shared/theme';
import { IconButton } from '../../shared/components/icon-button';

type RouteParams = {
  Serie: { seriesId: string; origin?: NavOrigin };
};

// serie.screen.tsx — zero domain logic. Everything it does with data comes straight from
// useSerie(); it only orchestrates NAVIGATION and local visual-only state (sort modal
// visibility, scroll-to-top button), neither of which useSerie needs to know about.
// Module scope so it is the same function across renders — an inline `item => item.id` is a new
// reference each time, which makes FlatList redo work it could otherwise skip.
const chapterKey = (item: SerieChapter) => item.id;

export function SerieScreen() {
  const { colors } = useTheme();
  const styles = useStyles(serieStyles);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'Serie'>>();
  const { seriesId, origin } = route.params ?? {};
  const t = useStrings();

  const [sortConfigVisible, setSortConfigVisible] = useState(false);
  // The sort modal edits locally and only commits on Save — this holds the in-progress value.
  const pendingSortRef = useRef<{ mode: ChapterSortMode; fixedThreshold: number | undefined; progressPercent: number }>({
    mode: 'ASCENDING',
    fixedThreshold: undefined,
    progressPercent: 50,
  });
  const listRef = useRef<FlatList>(null);

  const {
    loading,
    refreshing,
    error,
    serie,
    chapters,
    continueChapter,
    readCount,
    actionLabel,
    headerDetails,
    enrichmentGap,
    enrichmentOutcome,
    isFollowed,
    sortMode,
    sortFixedThreshold,
    sortProgressPercent,
    hasSeriesSortOverride,
    selectionMode,
    selectedIds,
    realize,
    backAction,
    refresh,
    toggleFollow,
    toggleSortOrder,
    updateSortPrefs,
    resetSortPrefs,
    onChapterLongPress,
    onChapterClick,
    selectAll,
    invertSelection,
    exitSelectionMode,
    markSelectedRead,
    markSelectedUnread,
    showScrollTop,
    handleScroll,
    hideScrollTop,
    onHeaderLayout,
  } = useSerie({ seriesId, origin });

  const enrichmentBanner = enrichmentBannerFor({ gap: enrichmentGap, outcome: enrichmentOutcome, t });


  function handleBack() {
    if (selectionMode) {
      exitSelectionMode();
      return;
    }
    realize(backAction)();
  }

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (selectionMode) {
          exitSelectionMode();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [selectionMode, exitSelectionMode]),
  );

  // Takes the id, not the chapter, and is a stable reference: every row holds on to this, and a
  // handler rebuilt on each render would re-render all of them (see ChapterListItem's memo note).
  const handleChapterPress = useCallback(
    (chapterId: string) => {
      if (selectionMode) {
        onChapterClick(chapterId);
        return;
      }
      // seriesName is a fast-path hint so the reader's top bar doesn't flash empty while it
      // would otherwise fetch the name — the reader falls back to fetching it when opened
      // without this.
      navigation.navigate(Routes.READER, { seriesId, chapterId, origin, seriesName: serie?.name });
    },
    [selectionMode, onChapterClick, navigation, seriesId, origin, serie?.name],
  );

  // Every chapter row is the same height, and that height is known without measuring anything —
  // it is the sum of the row's own tokens (see CHAPTER_ROW_HEIGHT). Handing it to FlatList lets
  // the list place every row directly instead of measuring them one by one, which is the
  // expensive part of scrolling a long series.
  const getItemLayout = useCallback(
    (_: ArrayLike<SerieChapter> | null | undefined, index: number) => ({
      length: CHAPTER_ROW_HEIGHT,
      offset: CHAPTER_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  // Stable renderItem: an inline arrow here would be a new function on every render, which makes
  // FlatList re-render every row regardless of the row component's own memoization.
  const renderChapter = useCallback(
    ({ item, index }: { item: SerieChapter; index: number }) => (
      <ChapterListItem
        chapter={item}
        title={ChapterTool.format.title(item, t)}
        index={index}
        selectionMode={selectionMode}
        selected={selectedIds.has(item.id)}
        onPress={handleChapterPress}
        onLongPress={onChapterLongPress}
      />
    ),
    [t, selectionMode, selectedIds, handleChapterPress, onChapterLongPress],
  );

  function handleActionPress() {
    const target = continueChapter ?? chapters[0];
    if (!target) {return;}
    navigation.navigate(Routes.READER, { seriesId, chapterId: target.id, origin, seriesName: serie?.name });
  }

  if (loading && chapters.length === 0 && !serie) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.icon.button.secondary} />
        <Text style={styles.message}>{t.seriesDetailLoading}</Text>
      </View>
    );
  }

  if (error && chapters.length === 0 && !serie) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t.seriesDetailError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refresh()}>
          <Text style={styles.retryText}>{t.seriesDetailRetry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <IconButton
          icon={ArrowLeft}
          glyph="arrow"
          size={icon.size[6]}
          color={colors.icon.primary}
          onPress={handleBack}
          alignStroke
        />
        <TouchableOpacity style={styles.starButton} onPress={toggleFollow} activeOpacity={0.8} accessibilityRole="button">
          <FollowStar active={isFollowed} size={icon.size[6]} color={colors.icon.secondary} activeColor={colors.icon.following} />
        </TouchableOpacity>
        <IconButton
          icon={Settings2}
          glyph="arrow"
          size={icon.size[6]}
          color={colors.icon.secondary}
          onPress={() => {
            pendingSortRef.current = {
              mode: sortMode,
              fixedThreshold: sortFixedThreshold,
              progressPercent: sortProgressPercent,
            };
            setSortConfigVisible(true);
          }}
        />
      </View>

      {/* Between the nav bar and the page content: what the enrichment server contributed, or
          did not. The outcome of a fetch that finished late wins over the "still fetching" note
          it replaces — otherwise the page would keep claiming to be waiting for something that
          already arrived. */}
      {enrichmentBanner && <FreshnessBanner variant={enrichmentBanner.variant} text={enrichmentBanner.text} />}

      <FlatList
        ref={listRef}
        data={chapters}
        keyExtractor={chapterKey}
        // Virtualization budget, tuned for the long series this screen has to survive (900+
        // chapters measured on device). The defaults render far more rows than a phone screen
        // shows and keep them mounted, which is what made one list update take ~10s.
        //
        // initialNumToRender covers roughly the first screenful; windowSize keeps one screen
        // above and below mounted; maxToRenderPerBatch caps how much is added per scroll tick so
        // a fast fling stays responsive instead of stalling on a huge batch.
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={5}
        removeClippedSubviews
        getItemLayout={getItemLayout}
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
        onScroll={handleScroll}
        scrollEventThrottle={100}
        ListHeaderComponent={
          <View onLayout={onHeaderLayout}>
            {serie && (
              <Header
                serie={serie}
                actionLabel={actionLabel}
                onActionPress={handleActionPress}
                details={headerDetails}
                t={t}
              />
            )}
            <View style={styles.sortBar}>
              <Text style={styles.chapterCount}>
                {readCount}/{chapters.length}
              </Text>
              <TouchableOpacity style={styles.sortToggle} onPress={toggleSortOrder}>
                <Text style={styles.sortToggleText}>{sortModeLabel(sortMode, sortFixedThreshold, sortProgressPercent, t)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={renderChapter}
      />

      {showScrollTop && !selectionMode && (
        <ScrollToTopButton
          onPress={() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
            hideScrollTop();
          }}
        />
      )}

      {selectionMode && (
        <SelectionBottomBar
          actions={[
            { key: 'select-all', icon: SquareCheckBig, label: t.seriesDetailSelectionSelectAll, onPress: selectAll },
            { key: 'invert', icon: Shuffle, label: t.seriesDetailSelectionInvert, onPress: invertSelection },
            { key: 'mark-read', icon: Check, label: t.seriesDetailSelectionMarkRead, onPress: markSelectedRead },
            { key: 'mark-unread', icon: X, label: t.seriesDetailSelectionMarkUnread, onPress: markSelectedUnread },
          ]}
        />
      )}

      <Modal
        visible={sortConfigVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSortConfigVisible(false)}>
        <Pressable style={styles.sortModalBackdrop} onPress={() => setSortConfigVisible(false)}>
          <Pressable style={styles.sortModalCard} onPress={() => {}}>
            <Text style={styles.sortModalTitle}>{t.seriesDetailSortConfigTitle}</Text>

            {hasSeriesSortOverride && (
              <Text style={styles.sortModalOverrideNote}>{t.seriesDetailSortConfigOverrideNote}</Text>
            )}

            <ChapterSortFields
              mode={sortMode}
              fixedThreshold={sortFixedThreshold}
              progressPercent={sortProgressPercent}
              t={t}
              onChange={(mode, fixedThreshold, progressPercent) => {
                pendingSortRef.current = { mode, fixedThreshold, progressPercent };
              }}
            />

            {hasSeriesSortOverride && (
              <Pressable
                style={styles.sortModalResetBtn}
                onPress={() => {
                  resetSortPrefs();
                  setSortConfigVisible(false);
                }}>
                <Text style={styles.sortModalResetText}>{t.seriesDetailSortConfigReset}</Text>
              </Pressable>
            )}

            <View style={styles.sortModalActions}>
              <Pressable
                style={[styles.sortModalBtn, styles.sortModalBtnSecondary]}
                onPress={() => setSortConfigVisible(false)}>
                <Text style={styles.sortModalBtnLabelSecondary}>{t.seriesDetailSortConfigCancel}</Text>
              </Pressable>
              <Pressable
                style={[styles.sortModalBtn, styles.sortModalBtnPrimary]}
                onPress={() => {
                  updateSortPrefs(pendingSortRef.current);
                  setSortConfigVisible(false);
                }}>
                <Text style={styles.sortModalBtnLabelPrimary}>{t.seriesDetailSortConfigSave}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// The one banner the serial page shows about enrichment, in precedence order: an outcome the
// user has not seen yet, then the fact that data is still missing. null = nothing to say.
function enrichmentBannerFor({
  gap,
  outcome,
  t,
}: {
  gap: 'pending' | 'failed' | undefined;
  outcome: 'updated' | 'failed' | null;
  t: Strings;
}): { variant: FreshnessBannerVariant; text: string } | null {
  if (outcome === 'updated') {return { variant: 'confirmed', text: t.seriesDetailEnrichmentUpdated };}
  if (outcome === 'failed') {return { variant: 'bad', text: t.seriesDetailEnrichmentUpdateFailed };}
  if (gap === 'pending') {return { variant: 'stale', text: t.seriesDetailEnrichmentPending };}
  if (gap === 'failed') {return { variant: 'bad', text: t.seriesDetailEnrichmentFailed };}
  return null;
}
