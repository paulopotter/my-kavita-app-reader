import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import type { NavOrigin } from '../../navigation/routes';
import { ReaderPageListView } from './components/ReaderPageListView';
import { useReader } from './useReader';

type RouteParams = {
  Reader: { seriesId: string; chapterId: string; origin?: NavOrigin };
};

export function ReaderScreen() {
  const route = useRoute<RouteProp<RouteParams, 'Reader'>>();
  const { seriesId, chapterId } = route.params ?? {};

  const reader = useReader(seriesId, chapterId);

  useEffect(() => {
    return () => {
      reader.onScreenExit();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!reader.viewer) {
    return <View style={styles.root} />;
  }

  const { curr } = reader.viewer;

  // TEMP DEBUG: isolando a ReaderPageListView nativa sozinha, sem Pressable/overlay/progress
  // bar por cima, para descobrir se a "tripa fina" persistente vem do componente nativo em si
  // ou de alguma interação com o resto da árvore RN desta tela.
  return (
    <View style={styles.root}>
      <ReaderPageListView
        pageUrls={curr.pages}
        onVisiblePageChanged={pageIndex => reader.setCurrentPage(pageIndex, 0)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
});
