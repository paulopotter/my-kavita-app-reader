import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Routes } from './routes';
import { MainNavigator } from './MainNavigator';
import { SetupScreen } from '../screens/setup/SetupScreen';
import { SeriesDetailScreen } from '../screens/series-detail/SeriesDetailScreen';
import { ReaderScreen } from '../screens/reader/ReaderScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';

const Stack = createNativeStackNavigator();

interface Props {
  initialRoute: string;
  onSetupComplete: () => void;
}

export function RootNavigator({ initialRoute, onSetupComplete }: Props) {
  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <Stack.Screen name={Routes.SETUP}>
        {() => <SetupScreen onComplete={onSetupComplete} />}
      </Stack.Screen>

      <Stack.Screen
        name="main"
        component={MainNavigator}
      />

      <Stack.Screen
        name={Routes.SERIES_DETAIL}
        component={SeriesDetailScreen}
        options={{
          // Deep links: mykavita://series/:seriesId and mymangas://...
        }}
        getId={({ params }) => (params as any)?.seriesId}
      />

      <Stack.Screen
        name={Routes.READER}
        component={ReaderScreen}
        getId={({ params }) => {
          const p = params as any;
          return `${p?.seriesId}/${p?.chapterId}`;
        }}
      />

      <Stack.Screen
        name={Routes.NOTIFICATIONS}
        component={NotificationsScreen}
      />
    </Stack.Navigator>
  );
}
