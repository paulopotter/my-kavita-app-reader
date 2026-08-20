import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SeriesSummary } from '../../../shared/bridge/library';
import { FollowStar } from '../../../shared/components/FollowStar';
import { Strings } from '../../../shared/i18n/strings';
import { formatProgress } from '../LibraryTransform';

interface Props {
  series: SeriesSummary;
  t: Strings;
  onToggleFollow: (id: number) => void;
  onPress?: (id: number) => void;
}

export function SeriesListItem({ series, t, onToggleFollow, onPress }: Props) {
  const progress = formatProgress(series.progressFraction);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress?.(series.id)}
      activeOpacity={0.8}
      disabled={!onPress}>
      <Image
        source={{ uri: series.coverUrl }}
        style={styles.thumb}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{series.name}</Text>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${Math.round(series.progressFraction * 100)}%` as any }]}
          />
        </View>
        <View style={styles.metaLine}>
          {series.readChapters != null && series.chapterCount != null ? (
            <Text style={styles.meta}>{series.readChapters}/{series.chapterCount} {t.chaptersFormat}</Text>
          ) : <View />}
          <Text style={styles.meta}>{progress}</Text>
        </View>
        {series.downloadedChapters != null && series.totalChapters != null && (
          <Text style={styles.chapters}>{series.downloadedChapters}/{series.totalChapters} cap.</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.starBtn}
        onPress={() => onToggleFollow(series.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <FollowStar active={series.isFollowed} size={22} color="#4A5568" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213E',
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 3,
    overflow: 'hidden',
  },
  thumb: { width: 52, height: 74, flexShrink: 0 },
  info: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
  name: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 3 },
  progressBar: {
    height: 4,
    backgroundColor: '#0F3460',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E94560',
    borderRadius: 2,
  },
  metaLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: { color: '#A0AEC0', fontSize: 12, marginBottom: 2 },
  chapters: { color: '#718096', fontSize: 11 },
  starBtn: { paddingHorizontal: 12 },
});
