import React, { useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

type RouteParams = {
  SeriesDetail: { seriesId: string; origin?: NavOrigin };
};

export function SeriesDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'SeriesDetail'>>();
  const { seriesId, origin = 'LIBRARY' } = route.params ?? {};
  const t = useStrings();

  const [sortConfigVisible, setSortConfigVisible] = useState(false);

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
    selectionMode,
    selectedIds,
    continueChapter,
    refresh,
    markRead,
    markUnread,
    toggleFollow,
    toggleSortOrder,
    updateSortPrefs,
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
      <TouchableOpacity style={styles.back} onPress={handleBack} accessibilityRole="button">
        <Text style={styles.backText}>← Voltar</Text>
      </TouchableOpacity>

      <View style={styles.sortBar}>
        <TouchableOpacity style={styles.sortToggle} onPress={toggleSortOrder}>
          <Text style={styles.sortToggleText}>
            {sortModeLabel(sortMode, sortFixedThreshold, sortProgressPercent, t)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sortConfigButton}
          onPress={() => setSortConfigVisible(true)}
          accessibilityRole="button">
          <Text style={styles.sortConfigIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={chapters}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#E94560" />
        }
        ListHeaderComponent={
          detail ? (
            <SeriesDetailHeader
              detail={detail}
              metadata={metadata}
              chapters={chapters}
              continueChapter={continueChapter}
              isFollowed={isFollowed}
              t={t}
              onToggleFollow={toggleFollow}
              onActionPress={handleActionPress}
            />
          ) : null
        }
        renderItem={({ item, index }) => (
          <ChapterListItem
            chapter={item}
            index={index}
            selectionMode={selectionMode}
            selected={selectedIds.has(item.id)}
            onPress={() => handleChapterPress(item)}
            onLongPress={() => onChapterLongPress(item.id)}
          />
        )}
      />

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
        t={t}
        onSave={(mode, fixedThreshold, progressPercent) => {
          updateSortPrefs(mode, fixedThreshold, progressPercent);
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
  back: { position: 'absolute', top: 20, left: 16, padding: 8, zIndex: 1 },
  backText: { color: '#E94560', fontSize: 15 },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#0F3460',
  },
  sortToggle: { paddingHorizontal: 10, paddingVertical: 4 },
  sortToggleText: { color: '#E94560', fontSize: 13, fontWeight: '600' },
  sortConfigButton: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4 },
  sortConfigIcon: { color: '#A0AEC0', fontSize: 16 },
});
