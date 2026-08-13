import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SeriesSummary } from '../../../shared/bridge/library';
import { FollowStar } from '../../../shared/components/FollowStar';
import { Strings } from '../../../shared/i18n/strings';
import {
  formatProgress,
  publicationLabel,
  statusLabel,
} from '../LibraryTransform';

interface Props {
  series: SeriesSummary;
  t: Strings;
  onToggleFollow: (id: number) => void;
  onPress?: (id: number) => void;
}

export function SeriesCard({ series, t, onToggleFollow, onPress }: Props) {
  const pubLabel = publicationLabel(series.publicationStatus, t);
  const progress = formatProgress(series.progressFraction);
  const sLabel = statusLabel(series.readStatus, t);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(series.id)}
      activeOpacity={0.8}
      disabled={!onPress}>
      <Image
        source={{ uri: series.coverUrl }}
        style={styles.cover}
        resizeMode="cover"
      />
      <TouchableOpacity
        style={styles.starBookmark}
        onPress={() => onToggleFollow(series.id)}
        activeOpacity={0.8}>
        <FollowStar active={series.isFollowed} size={18} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{series.name}</Text>

        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${Math.round(series.progressFraction * 100)}%` as any }]}
          />
        </View>
        <Text style={styles.progressText}>{progress}</Text>

        <View style={styles.badges}>
          <View style={[styles.badge, readStatusColor(series.readStatus)]}>
            <Text style={styles.badgeText}>{sLabel}</Text>
          </View>
          {pubLabel && (
            <View style={[styles.badge, styles.badgePub]}>
              <Text style={styles.badgeText}>{pubLabel}</Text>
            </View>
          )}
          {series.hasErrors && (
            <View style={[styles.badge, styles.badgeError]}>
              <Text style={styles.badgeText}>{t.hasErrors}</Text>
            </View>
          )}
        </View>

        {series.totalChapters != null && (
          <Text style={styles.chapters}>
            {series.downloadedChapters ?? '?'}/{series.totalChapters} {t.chaptersFormat}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function readStatusColor(status: SeriesSummary['readStatus']) {
  switch (status) {
    case 'READ': return styles.badgeRead;
    case 'IN_PROGRESS': return styles.badgeReading;
    case 'UNREAD': return styles.badgeUnread;
  }
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: '#16213E',
    borderRadius: 8,
    overflow: 'hidden',
  },
  // Bookmark-style: flush to right edge, starts 6dp from top, rounded on left side only
  starBookmark: {
    position: 'absolute',
    top: 6,
    right: 0,
    paddingLeft: 6,
    paddingRight: 4,
    paddingTop: 4,
    paddingBottom: 6,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  cover: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: '#0F3460',
  },
  info: {
    padding: 8,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
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
  progressText: {
    color: '#A0AEC0',
    fontSize: 10,
    marginBottom: 4,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  badgeRead: { backgroundColor: '#38A169' },
  badgeReading: { backgroundColor: '#D69E2E' },
  badgeUnread: { backgroundColor: '#4A5568' },
  badgePub: { backgroundColor: '#553C9A' },
  badgeError: { backgroundColor: '#C53030' },
  chapters: {
    color: '#A0AEC0',
    fontSize: 10,
  },
});
