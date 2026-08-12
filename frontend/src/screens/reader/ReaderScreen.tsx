import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NavOrigin } from '../../navigation/routes';

type RouteParams = {
  Reader: { seriesId: string; chapterId: string; origin?: NavOrigin };
};

export function ReaderScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'Reader'>>();
  const { seriesId, chapterId, origin = 'LIBRARY' } = route.params ?? {};

  function handleBack() {
    // Try to go back to SeriesDetail
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Deep link case: no SeriesDetail in stack, navigate explicitly
      navigation.reset({ index: 0, routes: [{ name: 'series/:seriesId', params: { seriesId, origin } }] });
    }
  }

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.back} onPress={handleBack}>
        <Text style={styles.backText}>← Voltar</Text>
      </TouchableOpacity>
      <Text style={styles.label}>Leitor</Text>
      <Text style={styles.sub}>Série {seriesId} · Cap. {chapterId}</Text>
      <Text style={styles.sub}>Em breve (Plano 007)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  back: { position: 'absolute', top: 20, left: 16, padding: 8 },
  backText: { color: '#E94560', fontSize: 15 },
  label: { color: '#fff', fontSize: 20, fontWeight: '600' },
  sub: { color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 13 },
});
