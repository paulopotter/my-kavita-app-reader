import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NavOrigin } from '../../navigation/routes';
import { originRouteFor } from '../../navigation/routes';

type RouteParams = {
  SeriesDetail: { seriesId: string; origin?: NavOrigin };
};

export function SeriesDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, 'SeriesDetail'>>();
  const { seriesId, origin = 'LIBRARY' } = route.params ?? {};

  function handleBack() {
    const targetRoute = originRouteFor(origin);
    const canGoBack = navigation.canGoBack();
    if (canGoBack) {
      navigation.goBack();
    } else {
      navigation.reset({ index: 0, routes: [{ name: targetRoute }] });
    }
  }

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.back} onPress={handleBack}>
        <Text style={styles.backText}>← Voltar</Text>
      </TouchableOpacity>
      <Text style={styles.label}>Série {seriesId}</Text>
      <Text style={styles.sub}>Em breve (Plano 006)</Text>
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
