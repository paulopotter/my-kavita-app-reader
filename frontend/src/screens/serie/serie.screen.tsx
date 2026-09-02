import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Settings } from 'lucide-react-native';
import type { NavOrigin } from '../../navigation/routes';
import { originRouteFor, Routes } from '../../navigation/routes';
import { useStrings } from '../../shared/i18n/useStrings';
import type { Strings } from '../../shared/i18n/strings';
import { FollowStar } from '../../shared/components/FollowStar';
import { ScrollToTopButton } from '../../shared/components/ScrollToTopButton';
import { ChapterListItem, ChapterSortConfigModal, Header, SelectionBottomBar } from './components';
import { useSerie } from './hooks';
import { styles } from './serie.styles';
import type { SerieChapter } from '../../shared';
import { ChapterTool } from '../../shared/tools/chapters';
import type { ChapterSortMode } from './serie.types';

const ICON_COLOR = '#FFFFFF';
const ICON_MUTED = '#A0AEC0';
const STAR_ACTIVE = '#F6AD55';

type RouteParams = {
  Serie: { seriesId: string; origin?: NavOrigin };
};

// Rewritten here instead of reused from shared/transforms/sortConfig.ts (legacy) — same 4 modes,
// same behavior. Purely presentational (which label a sort mode shows in the toggle button), so
// it lives with the screen that renders it, not with any domain tool.
function sortModeLabel(mode: ChapterSortMode, fixedThreshold: number | undefined, progressPercent: number, t: Strings): string {
  switch (mode) {
    case 'ASCENDING':
      return t.seriesDetailSortAscending;
    case 'DESCENDING':
      return t.seriesDetailSortDescending;
    case 'AUTO_FIXED':
      return t.seriesDetailSortAutoFixed.replace('{0}', String(fixedThreshold ?? 0));
    case 'AUTO_PROGRESS':
      return t.seriesDetailSortAutoProgress.replace('{0}', String(progressPercent));
  }
}

// serie.screen.tsx — zero domain logic. Everything it does with data comes straight from
// useSerie(); it only orchestrates NAVIGATION and local visual-only state (sort modal
// visibility, scroll-to-top button), neither of which useSerie needs to know about.
export function SerieScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'Serie'>>();
  const { seriesId, origin = 'LIBRARY' } = route.params ?? {};
  const t = useStrings();

  const [sortConfigVisible, setSortConfigVisible] = useState(false);
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
    isFollowed,
    sortMode,
    sortFixedThreshold,
    sortProgressPercent,
    hasSeriesSortOverride,
    selectionMode,
    selectedIds,
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

  function handleBack() {
    if (selectionMode) {
      exitSelectionMode();
      return;
    }
    const targetRoute = originRouteFor(origin);
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({ index: 0, routes: [{ name: targetRoute }] });
    }
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

  function handleChapterPress(chapter: SerieChapter) {
    if (selectionMode) {
      onChapterClick(chapter.id);
      return;
    }
    // seriesName is a fast-path hint so the reader's top bar doesn't flash empty while it would
    // otherwise fetch the name — the reader falls back to fetching it when opened without this.
    navigation.navigate(Routes.READER, { seriesId, chapterId: chapter.id, origin, seriesName: serie?.name });
  }

  function handleActionPress() {
    const target = continueChapter ?? chapters[0];
    if (!target) {return;}
    navigation.navigate(Routes.READER, { seriesId, chapterId: target.id, origin, seriesName: serie?.name });
  }

  if (loading && chapters.length === 0 && !serie) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E94560" />
        <Text style={styles.message}>{t.seriesDetailLoading}</Text>
      </View>
    );
  }

  if (error && chapters.length === 0 && !serie) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t.seriesDetailError}</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refresh()}>
          <Text style={styles.retryText}>{t.seriesDetailRetry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarButton} onPress={handleBack} accessibilityRole="button" hitSlop={8}>
          <ArrowLeft size={22} color={ICON_COLOR} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.starButton} onPress={toggleFollow} activeOpacity={0.8} accessibilityRole="button">
          <FollowStar active={isFollowed} size={26} color={ICON_MUTED} activeColor={STAR_ACTIVE} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.topBarButton}
          onPress={() => setSortConfigVisible(true)}
          accessibilityRole="button"
          hitSlop={8}>
          <Settings size={22} color={ICON_MUTED} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={chapters}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#E94560"
            progressBackgroundColor="rgba(22,33,62,0.85)"
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={100}
        ListHeaderComponent={
          <View onLayout={onHeaderLayout}>
            {serie && <Header serie={serie} actionLabel={actionLabel} onActionPress={handleActionPress} />}
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
        renderItem={({ item, index }) => (
          <ChapterListItem
            chapter={item}
            title={ChapterTool.format.title(item, t)}
            index={index}
            selectionMode={selectionMode}
            selected={selectedIds.has(item.id)}
            onPress={() => handleChapterPress(item)}
            onLongPress={() => onChapterLongPress(item.id)}
          />
        )}
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
          t={t}
          onMarkRead={markSelectedRead}
          onMarkUnread={markSelectedUnread}
          onSelectAll={selectAll}
          onInvertSelection={invertSelection}
        />
      )}

      <ChapterSortConfigModal
        visible={sortConfigVisible}
        mode={sortMode}
        fixedThreshold={sortFixedThreshold}
        progressPercent={sortProgressPercent}
        hasSeriesOverride={hasSeriesSortOverride}
        t={t}
        onSave={args => {
          updateSortPrefs(args);
          setSortConfigVisible(false);
        }}
        onReset={() => {
          resetSortPrefs();
          setSortConfigVisible(false);
        }}
        onCancel={() => setSortConfigVisible(false)}
      />
    </View>
  );
}
