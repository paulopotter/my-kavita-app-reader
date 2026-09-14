import React, { useCallback } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Routes } from '../../navigation/routes';
import { useStrings } from '../../shared/i18n';
import { DateTool } from '../../shared/tools/date';
import { HistoryItem } from './components/history-item';
import { useNotificationHistory } from './notifications.hooks';
import { styles } from './notifications.styles';
import type { NotificationHistoryRow } from './notifications.types';

// The in-app notification history — a tab of its own (MainNavigator), reachable independently of
// where the user came from, so it always returns to the Library tab when opening a series/reader
// (no NavOrigin variant exists for "from the notifications tab" and adding one isn't worth it for
// a single fallback destination).
export function NotificationsScreen() {
  const t = useStrings();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { loading, rows, markRead, markAllRead, deleteItem } = useNotificationHistory();

  const openItem = useCallback(
    async (row: NotificationHistoryRow) => {
      if (!row.read) {await markRead(row.ids);}
      if (row.chapterId) {
        navigation.navigate(Routes.READER, { seriesId: row.seriesId, chapterId: row.chapterId, origin: 'LIBRARY', seriesName: row.seriesName });
      } else {
        navigation.navigate(Routes.SERIES_DETAIL, { seriesId: row.seriesId, origin: 'LIBRARY' });
      }
    },
    [markRead, navigation],
  );

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.title}>{t.notificationsHistoryTitle}</Text>
        {rows.length > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllTxt}>{t.notificationsHistoryMarkAllRead}</Text>
          </TouchableOpacity>
        )}
      </View>

      {!loading && rows.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.message}>{t.notificationsHistoryEmpty}</Text>
        </View>
      )}

      <FlatList
        data={rows}
        keyExtractor={row => row.id}
        renderItem={({ item }) => (
          <HistoryItem
            seriesName={item.seriesName}
            bodyText={item.bodyText}
            timestampLabel={DateTool.format.to.relative(item.detectedAtMs, t)}
            read={item.read}
            onPress={() => openItem(item)}
            onDelete={() => deleteItem(item.ids)}
            deleteLabel={t.notificationsHistoryDelete}
          />
        )}
      />
    </View>
  );
}
