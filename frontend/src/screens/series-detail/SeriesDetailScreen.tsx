import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  StyleSheet,
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
import { Chapter } from '../../shared/bridge/series';
import { sortModeLabel } from './SeriesDetailTransform';
import { ChapterListItem } from './components/ChapterListItem';
import { ChapterSortConfigModal } from './components/ChapterSortConfigModal';
import { SelectionBottomBar } from './components/SelectionBottomBar';
import { SeriesDetailHeader } from './components/SeriesDetailHeader';
import { useSeriesDetail } from './useSeriesDetail';

const ICON_COLOR = '#FFFFFF';
const ICON_MUTED = '#A0AEC0';
const ACCENT = '#E94560';
const STAR_ACTIVE = '#F6AD55';

type RouteParams = {
  SeriesDetail: { seriesId: string; origin?: NavOrigin };
};

export function SeriesDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'SeriesDetail'>>();
  const { seriesId, origin = 'LIBRARY' } = route.params ?? {};
  const t = useStrings();

  const [sortConfigVisible, setSortConfigVisible] = useState(false);
  const listRef = useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const lastOffsetY = useRef(0);
  const headerHeightRef = useRef(0);

  const {
    loading,
    refreshing,
    error,
    detail,
    metadata,
    chapters,
    isFollowed,
    sortMode,
    sortFixedThreshold,
    sortProgressPercent,
    hasSeriesSortOverride,
    selectionMode,
    selectedIds,
    continueChapter,
    refresh,
    markRead,
    markUnread,
    toggleFollow,
    toggleSortOrder,
    updateSortPrefs,
    resetSortPrefs,
    onChapterLongPress,
    onChapterClick,
    selectAll,
    invertSelection,
    exitSelectionMode,
  } = useSeriesDetail(seriesId);

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
    React.useCallback(() => {
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

  function handleChapterPress(chapter: Chapter) {
    if (selectionMode) {
      onChapterClick(chapter.id);
      return;
    }
    navigation.navigate(Routes.READER, { seriesId, chapterId: chapter.id, origin });
  }

  function handleActionPress() {
    const target = continueChapter ?? chapters[0];
    if (!target) return;
    navigation.navigate(Routes.READER, { seriesId, chapterId: target.id, origin });
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const currentY = e.nativeEvent.contentOffset.y;
    const scrollingUp = currentY < lastOffsetY.current;
    lastOffsetY.current = currentY;
    const headerGone = currentY > headerHeightRef.current;
    setShowScrollTop(headerGone && scrollingUp);
  }

  if (loading && chapters.length === 0 && !detail) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E94560" />
        <Text style={styles.message}>{t.seriesDetailLoading}</Text>
      </View>
    );
  }

  if (error && chapters.length === 0 && !detail) {
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
        <TouchableOpacity
          style={styles.starButton}
          onPress={toggleFollow}
          activeOpacity={0.8}
          accessibilityRole="button">
          <Text style={[styles.starIcon, isFollowed && styles.starIconActive]}>
            {isFollowed ? '★' : '☆'}
          </Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#E94560" />
        }
        onScroll={handleScroll}
        scrollEventThrottle={100}
        ListHeaderComponent={
          <View onLayout={e => { headerHeightRef.current = e.nativeEvent.layout.height; }}>
            {detail && (
              <SeriesDetailHeader
                detail={detail}
                metadata={metadata}
                chapters={chapters}
                continueChapter={continueChapter}
                t={t}
                onActionPress={handleActionPress}
              />
            )}
            <View style={styles.sortBar}>
              <Text style={styles.chapterCount}>{chapters.filter(c => c.readStatus === 'READ').length}/{chapters.length}</Text>
              <TouchableOpacity style={styles.sortToggle} onPress={toggleSortOrder}>
                <Text style={styles.sortToggleText}>
                  {sortModeLabel(sortMode, sortFixedThreshold, sortProgressPercent, t)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <ChapterListItem
            chapter={item}
            index={index}
            selectionMode={selectionMode}
            selected={selectedIds.has(item.id)}
            t={t}
            onPress={() => handleChapterPress(item)}
            onLongPress={() => onChapterLongPress(item.id)}
          />
        )}
      />

      {showScrollTop && !selectionMode && (
        <TouchableOpacity
          style={styles.scrollTopBtn}
          onPress={() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
            setShowScrollTop(false);
          }}>
          <Text style={styles.scrollTopIcon}>↑</Text>
        </TouchableOpacity>
      )}

      {selectionMode && (
        <SelectionBottomBar
          t={t}
          onMarkRead={() => markRead(Array.from(selectedIds))}
          onMarkUnread={() => markUnread(Array.from(selectedIds))}
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
        onSave={(mode, fixedThreshold, progressPercent) => {
          updateSortPrefs(mode, fixedThreshold, progressPercent);
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1A1A2E' },
  center: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: { color: '#A0AEC0', fontSize: 16, marginTop: 12, textAlign: 'center' },
  errorText: { color: '#FC8181', fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  errorDetail: { color: '#A0AEC0', fontSize: 13, marginBottom: 20, textAlign: 'center' },
  retryButton: { backgroundColor: '#E94560', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  topBarButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starButton: { alignItems: 'center', justifyContent: 'center' },
  starIcon: { fontSize: 26, color: ICON_MUTED },
  starIconActive: { color: STAR_ACTIVE },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#0F3460',
  },
  chapterCount: { color: ICON_MUTED, fontSize: 12 },
  sortToggle: { paddingHorizontal: 4, paddingVertical: 4 },
  sortToggleText: { color: ACCENT, fontSize: 13, fontWeight: '600' },
  scrollTopBtn: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E94560',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  scrollTopIcon: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', lineHeight: 24 },
});
