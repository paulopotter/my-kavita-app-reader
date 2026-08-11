import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useStrings } from '../../shared/i18n/useStrings';
import { SeriesSummary } from '../../shared/bridge/library';
import { SeriesCard } from './components/SeriesCard';
import { useLibrary } from './useLibrary';

const SCROLL_THRESHOLD = 300;

export function LibraryScreen() {
  const t = useStrings();
  const { loading, data, error, refresh } = useLibrary();
  const listRef = useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const lastOffsetY = useRef(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = e.nativeEvent.contentOffset.y;
    const scrollingUp = currentY < lastOffsetY.current;
    lastOffsetY.current = currentY;
    // Visible only when scrolling UP and past the threshold
    setShowScrollTop(scrollingUp && currentY > SCROLL_THRESHOLD);
  };

  const renderItem = useCallback(({ item }: { item: SeriesSummary | null }) =>
    item ? (
      <SeriesCard series={item} t={t} />
    ) : (
      <View style={styles.cardPlaceholder} />
    ),
  [t]);

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
        <Text style={styles.message}>{t.libraryEmpty}</Text>
      </View>
    );
  }

  // Pad to even count so the last row always has two cards
  const padded = data.length % 2 === 0 ? data : [...data, null];

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={padded}
        keyExtractor={(item, idx) => item ? String(item.id) : `pad-${idx}`}
        numColumns={2}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => refresh(true)} tintColor="#E94560" />
        }
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      />
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
  list: { padding: 6 },
  cardPlaceholder: { flex: 1, margin: 6 },
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
