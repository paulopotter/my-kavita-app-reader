import React, { useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import type { NativeSyntheticEvent, TextLayoutEventData } from 'react-native';
import type { Serie } from '../../../../shared';
import type { Strings } from '../../../../shared/i18n';
import { headerStyles } from './header.styles';
import { useStyles } from '../../../../shared/context';

interface Props {
  serie: Serie;
  // Action-button label, composed by the caller (useSerie) — this dumb component never derives
  // "start" vs. "continue ch. N" vs. "reread" itself.
  actionLabel: string;
  onActionPress: () => void;
  t: Strings;
}

// A long description is clamped to this many lines by default — "read more" reveals the rest.
// Purely presentational, so this stays a local useState in the dumb component (no domain logic,
// no service call) rather than something useSerie needs to own.
const DESCRIPTION_CLAMP_LINES = 6;

// Dumb: renders the data it's given (cover, name, description, chips) and fires onActionPress.
export function Header({ serie, actionLabel, onActionPress, t }: Props) {
  const styles = useStyles(headerStyles);
  const tags = [...(serie.metadata?.genres ?? []), ...(serie.metadata?.tags ?? [])];
  const [expanded, setExpanded] = useState(false);
  // Whether the description actually overflows DESCRIPTION_CLAMP_LINES — only known once RN lays
  // the unclamped text out once (onTextLayout below), so the "read more" toggle doesn't render
  // (falsely) for a description that already fits.
  const [overflowing, setOverflowing] = useState(false);

  const handleDescriptionLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    if (!expanded && e.nativeEvent.lines.length > DESCRIPTION_CLAMP_LINES) {
      setOverflowing(true);
    }
  };

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

      {serie.metadata?.description ? (
        <>
          <Text
            style={styles.summary}
            numberOfLines={expanded ? undefined : DESCRIPTION_CLAMP_LINES}
            onTextLayout={handleDescriptionLayout}
          >
            {serie.metadata.description}
          </Text>
          {/* Rendered from the start (opacity 0 until overflow is known), never conditionally
              mounted — RN only learns the real line count from onTextLayout, after the first
              paint, so mounting this late would shift the chips/action button below it down by
              its own height right as the user opens the screen. */}
          <TouchableOpacity
            onPress={() => setExpanded(current => !current)}
            hitSlop={8}
            disabled={!overflowing}
            style={!overflowing && styles.summaryToggleHidden}
          >
            <Text style={styles.summaryToggle}>
              {expanded ? t.seriesDetailDescriptionReadLess : t.seriesDetailDescriptionReadMore}
            </Text>
          </TouchableOpacity>
        </>
      ) : null}

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
