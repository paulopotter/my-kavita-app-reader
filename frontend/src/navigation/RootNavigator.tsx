import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Routes } from './routes';
import { MainNavigator } from './MainNavigator';
import { SplashScreen } from '../screens/splash';
import { SetupScreen } from '../screens/config/setup';
import { SerieScreen } from '../screens/serie';
import { ReaderScreen } from '../screens/reader';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';

const Stack = createNativeStackNavigator();

interface Props {
  // Defaults to the splash, which decides where to go. Kept overridable for tests / a future
  // dynamic initial route (see App.tsx's commented restored-route block).
  initialRoute?: string;
  onSetupComplete: () => void;
}

export function RootNavigator({ initialRoute = Routes.SPLASH, onSetupComplete }: Props) {
  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <Stack.Screen name={Routes.SPLASH} component={SplashScreen} />

      <Stack.Screen name={Routes.SETUP}>
        {() => <SetupScreen onComplete={onSetupComplete} />}
      </Stack.Screen>

      <Stack.Screen
        name={Routes.HUB}
        component={MainNavigator}
      />

      <Stack.Screen
        name={Routes.SERIES_DETAIL}
        component={SerieScreen}
        options={{
          // Deep links resolve via linking.config.ts (App.tsx's NavigationContainer `linking`
          // prop) — deeplink://series/:seriesId. The public mymangareader:// scheme (and any
          // configured http(s) host) is rewritten to this internal scheme by MainActivity
          // (DeepLinkNormalizer.kt) before RN ever sees it. Not configured here.
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
