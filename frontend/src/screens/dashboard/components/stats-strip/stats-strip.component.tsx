import React from 'react';
import { Text, View } from 'react-native';
import { useStrings } from '../../../../shared/i18n';
import { useStyles } from '../../../../shared/context';
import type { DashboardStats } from '../../dashboard.types';
import { statsStripStyles } from './stats-strip.styles';

export function StatsStrip({ stats }: { stats: DashboardStats }) {
  const styles = useStyles(statsStripStyles);
  const t = useStrings();
  const entries = [
    { label: t.dashboardStatSeries, value: stats.series },
    { label: t.dashboardStatFollowed, value: stats.followed },
    { label: t.dashboardStatInProgress, value: stats.inProgress },
  ];
  return (
    <View style={styles.row}>
      {entries.map(entry => (
        <View key={entry.label} style={styles.stat}>
          <Text style={styles.value}>{entry.value}</Text>
          <Text style={styles.label}>{entry.label}</Text>
        </View>
      ))}
    </View>
  );
}
