import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Routes } from './routes';
import { MainNavigator } from './MainNavigator';
import { SetupScreen } from '../screens/setup/SetupScreen';
import { SerieScreen } from '../screens/serie';
// Reader V2 — the ground-up rewrite (position-indexed window + single moveFocus path). The legacy
// screens/reader/ tree stays on disk for reference/rollback until this is device-validated; the
// final cut renames reader/ -> reader-legacy/ and reader-v2/ -> reader/.
import { ReaderScreen } from '../screens/reader-v2';
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
        component={SerieScreen}
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
