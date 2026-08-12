import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SeriesSummary } from '../../shared/bridge/library';
import { useStrings } from '../../shared/i18n/useStrings';
import { NavOrigin, Routes } from '../../navigation/routes';
import { SeriesCard } from './components/SeriesCard';
import { SeriesListItem } from './components/SeriesListItem';
import { UseLibraryOptions, useLibrary } from './useLibrary';

interface Props extends UseLibraryOptions {
  emptyText?: string;
}

const SCROLL_THRESHOLD = 300;

export function LibraryScreen({ filter, prefsKey, emptyText }: Props = {}) {
  const t = useStrings();
  const { loading, data, error, viewMode, sortMode, refresh, setViewMode, setSortMode, toggleFollow } = useLibrary({ filter, prefsKey });
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const listRef = useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const lastOffsetY = useRef(0);
  const origin: NavOrigin = prefsKey === 'following' ? 'FOLLOWING' : 'LIBRARY';

  const openSeriesDetail = useCallback((seriesId: number) => {
    navigation.navigate(Routes.SERIES_DETAIL, { seriesId: String(seriesId), origin });
  }, [navigation, origin]);

  // ── Alphabet index (only in LIST + ALPHABETICAL) ─────────────────────────
  const alphabetIndex = useMemo<Map<string, number>>(() => {
    if (viewMode !== 'LIST' || sortMode !== 'ALPHABETICAL') return new Map();
    const map = new Map<string, number>();
    data.forEach((series, index) => {
      const letter = series.name[0]?.toUpperCase() ?? '#';
      if (!map.has(letter)) map.set(letter, index);
    });
    return map;
  }, [data, viewMode, sortMode]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = e.nativeEvent.contentOffset.y;
    const scrollingUp = currentY < lastOffsetY.current;
    lastOffsetY.current = currentY;
    setShowScrollTop(scrollingUp && currentY > SCROLL_THRESHOLD);
  };

  const renderGridItem = useCallback(({ item }: { item: SeriesSummary | null }) =>
    item ? (
      <SeriesCard series={item} t={t} onToggleFollow={toggleFollow} onPress={openSeriesDetail} />
    ) : (
      <View style={styles.cardPlaceholder} />
    ),
  [t, toggleFollow, openSeriesDetail]);

  const renderListItem = useCallback(({ item }: { item: SeriesSummary }) =>
    <SeriesListItem series={item} t={t} onToggleFollow={toggleFollow} onPress={openSeriesDetail} />,
  [t, toggleFollow, openSeriesDetail]);

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
        <TouchableOpacity style={styles.retryButton} onPress={() => refresh(true)}>
          <Text style={styles.retryText}>{t.libraryRetry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!loading && data.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{emptyText ?? t.libraryEmpty}</Text>
      </View>
    );
  }

  const padded = viewMode === 'GRID' && data.length % 2 !== 0 ? [...data, null] : data;

  return (
    <View style={styles.root}>
      {/* ── Top bar: count + sort toggle + view toggle ── */}
      <View style={styles.topBar}>
        <Text style={styles.countTxt}>{data.length} {t.librarySeriesCount}</Text>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSortMode(sortMode === 'RECENTLY_UPDATED' ? 'ALPHABETICAL' : 'RECENTLY_UPDATED')}>
          <Text style={styles.sortBtnTxt}>
            {sortMode === 'RECENTLY_UPDATED' ? t.librarySortRecentlyUpdated : t.librarySortAlphabetical}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.viewToggleBtn}
          onPress={() => setViewMode(viewMode === 'GRID' ? 'LIST' : 'GRID')}>
          <Text style={styles.viewToggleIcon}>{viewMode === 'GRID' ? '☰' : '⊞'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      <View style={styles.content}>
        <FlatList
          ref={listRef}
          data={padded as any}
          keyExtractor={(item: any, idx) => item ? String(item.id) : `pad-${idx}`}
          numColumns={viewMode === 'GRID' ? 2 : 1}
          key={viewMode} // force re-mount on mode change to reset numColumns
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => refresh(true)} tintColor="#E94560" />
          }
          renderItem={viewMode === 'GRID' ? renderGridItem : renderListItem as any}
          contentContainerStyle={
            viewMode === 'GRID'
              ? styles.gridList
              : alphabetIndex.size > 0 ? styles.listListWithIndex : styles.listList
          }
          onScroll={handleScroll}
          scrollEventThrottle={100}
        />

        {/* ── Alphabet index sidebar ── */}
        {alphabetIndex.size > 0 && (
          <View style={styles.alphaBar} pointerEvents="box-none">
            <ScrollView
              style={styles.alphaScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.alphaContent}>
              {Array.from(alphabetIndex.keys()).map(letter => (
                <TouchableOpacity
                  key={letter}
                  style={styles.alphaItem}
                  onPress={() => {
                    const idx = alphabetIndex.get(letter);
                    if (idx != null) listRef.current?.scrollToIndex({ index: idx, animated: false });
                  }}>
                  <Text style={styles.alphaLetter}>{letter}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Scroll to top ── */}
        {showScrollTop && (
          <TouchableOpacity
            style={styles.scrollTopBtn}
            onPress={() => {
              listRef.current?.scrollToOffset({ offset: 0, animated: true });
              setShowScrollTop(false);
            }}>
            <Text style={styles.scrollTopIcon}>↑</Text>
          </TouchableOpacity>
        )}
      </View>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#0F3460',
  },
  countTxt: { color: '#718096', fontSize: 12, flex: 1 },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  sortBtnTxt: { color: '#E94560', fontSize: 13, fontWeight: '600' },
  viewToggleBtn: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4 },
  viewToggleIcon: { color: '#A0AEC0', fontSize: 18 },

  content: { flex: 1 },
  gridList: { padding: 6 },
  listList: { paddingVertical: 4 },
  listListWithIndex: { paddingVertical: 4, paddingRight: 40 },
  cardPlaceholder: { flex: 1, margin: 6 },

  alphaBar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 36,
    justifyContent: 'center',
    backgroundColor: 'rgba(15,52,96,0.85)',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  alphaScroll: { flexGrow: 0 },
  alphaContent: { paddingVertical: 6 },
  alphaItem: {
    width: 36,
    alignItems: 'center',
    paddingVertical: 3,
  },
  alphaLetter: {
    color: '#E94560',
    fontSize: 11,
    fontWeight: '700',
  },

  scrollTopBtn: {
    position: 'absolute',
    right: 36,
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
