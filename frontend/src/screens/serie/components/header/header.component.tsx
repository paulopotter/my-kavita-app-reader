import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import type { Serie, SerieChapter } from '../../../../shared';
import type { Strings } from '../../../../shared/i18n/strings';
import { styles } from './header.styles';

interface Props {
  serie: Serie;
  continueChapter: SerieChapter | null;
  t: Strings;
  onActionPress: () => void;
}

// Dumb: only decides how the action button is labeled given data it already has (continueChapter,
// read/total counts) — the actual resume-chapter decision lives in the Kotlin digest builder
// (serie.resumePoint), never recomputed here.
function actionButtonLabel(continueChapter: SerieChapter | null, readCount: number, totalCount: number, t: Strings): string {
  if (totalCount === 0) {return t.seriesDetailStartReading;}
  if (readCount === 0) {return t.seriesDetailStartReading;}
  if (continueChapter === null) {return t.seriesDetailRereadFromStart;}
  const number = continueChapter.decimalNumber ?? continueChapter.number;
  return t.seriesDetailContinueReading.replace('{0}', number != null ? String(number) : continueChapter.title);
}

export function Header({ serie, continueChapter, t, onActionPress }: Props) {
  const readCount = serie.chapters.filter(c => c.readStatus === 'READ').length;
  const actionLabel = actionButtonLabel(continueChapter, readCount, serie.chapters.length, t);
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
        <Text style={styles.actionButtonText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
