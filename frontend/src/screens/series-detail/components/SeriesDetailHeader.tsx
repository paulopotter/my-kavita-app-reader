import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Chapter, SeriesDetail, SeriesMetadata } from '../../../shared/bridge/series';
import { Strings } from '../../../shared/i18n/strings';
import { actionButtonLabel } from '../SeriesDetailTransform';

interface Props {
  detail: SeriesDetail;
  metadata: SeriesMetadata | null;
  chapters: Chapter[];
  continueChapter: Chapter | null;
  isFollowed: boolean;
  t: Strings;
  onToggleFollow: () => void;
  onActionPress: () => void;
}

export function SeriesDetailHeader({
  detail,
  metadata,
  chapters,
  continueChapter,
  isFollowed,
  t,
  onToggleFollow,
  onActionPress,
}: Props) {
  const readCount = chapters.filter(c => c.readStatus === 'READ').length;
  const actionLabel = actionButtonLabel(continueChapter, readCount, chapters.length, t);
  const tags = [...metadata?.genres ?? [], ...metadata?.tags ?? []];

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <Image source={{ uri: detail.coverImageUrl }} style={styles.cover} resizeMode="cover" />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={3}>{detail.name}</Text>
          <TouchableOpacity
            style={styles.starButton}
            onPress={onToggleFollow}
            activeOpacity={0.8}
            accessibilityRole="button">
            <Text style={[styles.starIcon, isFollowed && styles.starIconActive]}>
              {isFollowed ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.count}>{readCount}/{chapters.length}</Text>
        </View>
      </View>

      {metadata?.summary ? <Text style={styles.summary}>{metadata.summary}</Text> : null}

      {tags.length > 0 && (
        <View style={styles.chips}>
          {tags.map(tag => (
            <View key={tag} style={styles.chip}>
              <Text style={styles.chipText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.actionButton} onPress={onActionPress} activeOpacity={0.8}>
        <Text style={styles.actionButtonText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16 },
  topRow: { flexDirection: 'row' },
  cover: { width: 100, aspectRatio: 2 / 3, borderRadius: 8, backgroundColor: '#0F3460' },
  info: { flex: 1, marginLeft: 12, justifyContent: 'flex-start' },
  name: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  starButton: { marginTop: 8, alignSelf: 'flex-start' },
  starIcon: { fontSize: 24, color: '#FFFFFF' },
  starIconActive: { color: '#F6AD55' },
  count: { color: '#A0AEC0', fontSize: 12, marginTop: 8 },
  summary: { color: '#CBD5E0', fontSize: 13, marginTop: 12, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: { backgroundColor: '#16213E', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { color: '#CBD5E0', fontSize: 11 },
  actionButton: {
    marginTop: 16,
    backgroundColor: '#E94560',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
