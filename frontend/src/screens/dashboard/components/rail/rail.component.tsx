import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { useStrings } from '../../../../shared/i18n';
import { useStyles } from '../../../../shared/context';
import type { DashboardItem } from '../../dashboard.types';
import { RailCard } from '../rail-card';
import { railStyles } from './rail.styles';

// A titled horizontal list of tiles. Always rendered: with nothing to show it says so instead of
// disappearing — or, while its tiles are still on the way, holds their place with grey blocks so the
// rail does not jump when they arrive. Local to the Dashboard until a second screen needs one.
export interface RailProps {
  title: string;
  items: DashboardItem[];
  onPressItem: (item: DashboardItem) => void;
  // The tiles are still being fetched: show placeholders instead of "nothing here".
  loading?: boolean;
}

const PLACEHOLDER_TILES = [0, 1, 2];

export function Rail({ title, items, onPressItem, loading = false }: RailProps) {
  const styles = useStyles(railStyles);
  const t = useStrings();
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {items.length === 0 && loading ? (
        <View style={styles.placeholderRow} testID="rail-placeholder">
          {PLACEHOLDER_TILES.map(key => (
            <View key={key} style={styles.placeholderTile}>
              <View style={styles.placeholderCover} />
              <View style={styles.placeholderName} />
              <View style={styles.placeholderCaption} />
            </View>
          ))}
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>{t.dashboardEmpty}</Text>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={items}
          keyExtractor={item => item.seriesId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RailCard
              id={item.seriesId}
              name={item.name}
              coverUrl={item.coverUrl}
              caption={item.caption}
              progressFraction={item.progressFraction}
              blurred={item.blurred}
              onPress={() => onPressItem(item)}
            />
          )}
        />
      )}
    </View>
  );
}
