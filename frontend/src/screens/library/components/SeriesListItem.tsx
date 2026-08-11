import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SeriesSummary } from '../../../shared/bridge/library';
import { Strings } from '../../../shared/i18n/strings';
import { formatProgress, statusLabel } from '../LibraryTransform';

interface Props {
  series: SeriesSummary;
  t: Strings;
  onToggleFollow: (id: number) => void;
}

export function SeriesListItem({ series, t, onToggleFollow }: Props) {
  const sLabel = statusLabel(series.readStatus, t);
  const progress = formatProgress(series.progressFraction);

  return (
    <View style={styles.row}>
      <Image
        source={{ uri: series.coverUrl }}
        style={styles.thumb}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{series.name}</Text>
        <Text style={styles.meta}>{sLabel} · {progress}</Text>
        {series.downloadedChapters != null && series.totalChapters != null && (
          <Text style={styles.chapters}>{series.downloadedChapters}/{series.totalChapters} cap.</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.starBtn}
        onPress={() => onToggleFollow(series.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={[styles.star, series.isFollowed && styles.starActive]}>
          {series.isFollowed ? '★' : '☆'}
        </Text>
      </TouchableOpacity>
    </View>
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
  meta: { color: '#A0AEC0', fontSize: 12, marginBottom: 2 },
  chapters: { color: '#718096', fontSize: 11 },
  starBtn: { paddingHorizontal: 12 },
  star: { fontSize: 22, color: '#4A5568' },
  starActive: { color: '#F6AD55' },
});
