import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { FollowStar } from '../../../../shared/components/follow-star';
import { styles } from './series-list-item.styles';

// Dumb component: primitives + callbacks + render only.
export interface SeriesListItemProps {
  id: string;
  name: string;
  coverUrl: string;
  progressFraction: number;
  progressLabel: string;
  chapterCountLabel?: string;
  downloadedLabel?: string;
  isFollowed: boolean;
  onToggleFollow: (id: string) => void;
  onPress: (id: string) => void;
}

// React.memo — see SeriesCard's own note. Same rationale for the list layout.
export const SeriesListItem = React.memo(function SeriesListItem({
  id,
  name,
  coverUrl,
  progressFraction,
  progressLabel,
  chapterCountLabel,
  downloadedLabel,
  isFollowed,
  onToggleFollow,
  onPress,
}: SeriesListItemProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(id)} activeOpacity={0.8}>
      <Image source={{ uri: coverUrl }} style={styles.thumb} resizeMode="cover" />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.round(progressFraction * 100)}%` }]} />
        </View>
        <View style={styles.metaLine}>
          {chapterCountLabel ? <Text style={styles.meta}>{chapterCountLabel}</Text> : <View />}
          <Text style={styles.meta}>{progressLabel}</Text>
        </View>
        {downloadedLabel && <Text style={styles.chapters}>{downloadedLabel}</Text>}
      </View>
      <TouchableOpacity
        style={styles.starBtn}
        onPress={() => onToggleFollow(id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <FollowStar active={isFollowed} size={22} color="#4A5568" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});
