import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { FollowStar } from '../../../../shared/components/follow-star';
import { styles } from './series-card.styles';

// Dumb component: primitives + callbacks + render only. All labels are computed in the hook /
// SerieTool and passed in as strings — this component holds no i18n and no domain logic.
export interface SeriesCardProps {
  id: string;
  name: string;
  coverUrl: string;
  progressFraction: number;
  progressLabel: string;
  chapterCountLabel?: string; // "3/12 caps." — omitted when the entry has no chapter counts
  downloadedLabel?: string; // "12/40 caps." (BFF) — omitted when no BFF match
  publicationLabel?: string; // localized publication status — omitted when unknown
  errorsLabel?: string; // localized "Errors" — omitted unless hasErrors
  isFollowed: boolean;
  onToggleFollow: (id: string) => void;
  onPress: (id: string) => void;
}

// React.memo: the Library list re-orders on a sort toggle (new array, new renderItem call for
// every row), but a row whose own props are unchanged must not re-render. Every prop here is a
// primitive or a stable useCallback from the screen, so the default shallow compare is enough.
export const SeriesCard = React.memo(function SeriesCard({
  id,
  name,
  coverUrl,
  progressFraction,
  progressLabel,
  chapterCountLabel,
  downloadedLabel,
  publicationLabel,
  errorsLabel,
  isFollowed,
  onToggleFollow,
  onPress,
}: SeriesCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(id)} activeOpacity={0.8}>
      <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
      <TouchableOpacity style={styles.starBookmark} onPress={() => onToggleFollow(id)} activeOpacity={0.8}>
        <FollowStar active={isFollowed} size={18} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.round(progressFraction * 100)}%` }]} />
        </View>
        <View style={styles.progressLine}>
          {chapterCountLabel ? <Text style={styles.progressText}>{chapterCountLabel}</Text> : <View />}
          <Text style={styles.progressText}>{progressLabel}</Text>
        </View>

        {(publicationLabel || errorsLabel) && (
          <View style={styles.badges}>
            {publicationLabel && (
              <View style={[styles.badge, styles.badgePub]}>
                <Text style={styles.badgeText}>{publicationLabel}</Text>
              </View>
            )}
            {errorsLabel && (
              <View style={[styles.badge, styles.badgeError]}>
                <Text style={styles.badgeText}>{errorsLabel}</Text>
              </View>
            )}
          </View>
        )}

        {downloadedLabel && <Text style={styles.chapters}>{downloadedLabel}</Text>}
      </View>
    </TouchableOpacity>
  );
});
