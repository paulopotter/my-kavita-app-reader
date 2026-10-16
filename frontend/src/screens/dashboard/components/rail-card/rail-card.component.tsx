import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { useStyles } from '../../../../shared/context';
import { railCardStyles } from './rail-card.styles';

// Dumb component: primitives + one callback. The caption arrives already localized; no
// progressFraction means no bar.
export interface RailCardProps {
  id: string;
  name: string;
  coverUrl: string;
  caption?: string;
  progressFraction?: number;
  onPress: (id: string) => void;
}

export const RailCard = React.memo(function RailCard({
  id,
  name,
  coverUrl,
  caption,
  progressFraction,
  onPress,
}: RailCardProps) {
  const styles = useStyles(railCardStyles);
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(id)} activeOpacity={0.8}>
      <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
      {caption != null && <Text style={styles.caption} numberOfLines={1}>{caption}</Text>}
      {progressFraction != null && (
        <View style={styles.progressBar} testID="rail-card-progress">
          <View style={[styles.progressFill, { width: `${Math.round(progressFraction * 100)}%` }]} />
        </View>
      )}
    </TouchableOpacity>
  );
});
