import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import type { Serie } from '../../../../shared';
import { styles } from './header.styles';

interface Props {
  serie: Serie;
  // Action-button label, composed by the caller (useSerie) — this dumb component never derives
  // "start" vs. "continue ch. N" vs. "reread" itself.
  actionLabel: string;
  onActionPress: () => void;
}

// Dumb: renders the data it's given (cover, name, description, chips) and fires onActionPress.
export function Header({ serie, actionLabel, onActionPress }: Props) {
  const tags = [...(serie.metadata?.genres ?? []), ...(serie.metadata?.tags ?? [])];

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <Image source={{ uri: serie.coverImage.url }} style={styles.cover} resizeMode="cover" />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={3}>
            {serie.name}
          </Text>
        </View>
      </View>

      {serie.metadata?.description ? <Text style={styles.summary}>{serie.metadata.description}</Text> : null}

      {tags.length > 0 && (
        <View style={styles.chips}>
          {tags.map(tag => (
            <View key={tag.id} style={styles.chip}>
              <Text style={styles.chipText}>{tag.name}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.actionButton} onPress={onActionPress} activeOpacity={0.8}>
        {/* One line, ellipsized — a long real chapter title must never grow the button or wrap. */}
        <Text style={styles.actionButtonText} numberOfLines={1} ellipsizeMode="tail">
          {actionLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
