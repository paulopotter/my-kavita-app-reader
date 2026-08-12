import React, { useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Routes } from './routes';
import { LibraryScreen } from '../screens/library/LibraryScreen';
import { FollowingScreen } from '../screens/following/FollowingScreen';
import { ConfigScreen } from '../screens/config/ConfigScreen';
import { useAppShellState } from '../shared/components/AppShellState';
import { useStrings } from '../shared/i18n/useStrings';

const Tab = createBottomTabNavigator();

const BG = '#16213E';
const BORDER = '#0F3460';
const ACTIVE = '#E94560';
const INACTIVE = 'rgba(255,255,255,0.45)';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={{ fontSize: 11, color: focused ? ACTIVE : INACTIVE, marginTop: 2 }}>{label}</Text>;
}

// Extracted to avoid react/no-unstable-nested-components lint warning.
function ConfigTab({
  onRegisterBackHandler,
  onServerCleared,
}: {
  onRegisterBackHandler: (fn: (() => boolean) | null) => void;
  onServerCleared: () => void;
}) {
  return (
    <ConfigScreen
      onRegisterBackHandler={onRegisterBackHandler}
      onServerCleared={onServerCleared}
    />
  );
}

export function MainNavigator() {
  const { refresh, hasFollowedSeries } = useAppShellState();
  const strings = useStrings();
  const navigation = useNavigation<any>();
  const isConfigSubScreenRef = useRef(false);

  const handleRegisterBackHandler = (fn: (() => boolean) | null) => {
    isConfigSubScreenRef.current = fn !== null;
  };

  const handleServerCleared = () => {
    refresh();
    navigation.reset({ index: 0, routes: [{ name: Routes.SETUP }] });
  };

  const initialTab = hasFollowedSeries ? Routes.FOLLOWING : Routes.LIBRARY;

  return (
    <Tab.Navigator
      key={initialTab}
      initialRouteName={initialTab}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: BG,
          borderTopColor: BORDER,
          borderTopWidth: 1,
          height: 60,
        },
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      {hasFollowedSeries && (
        <Tab.Screen
          name={Routes.FOLLOWING}
          component={FollowingScreen}
          options={{
            tabBarLabel: strings.navFollowing,
            tabBarIcon: ({ focused }) => <TabIcon label="★" focused={focused} />,
          }}
        />
      )}
      <Tab.Screen
        name={Routes.LIBRARY}
        component={LibraryScreen}
        options={{
          tabBarLabel: strings.navLibrary,
          tabBarIcon: ({ focused }) => <TabIcon label="📚" focused={focused} />,
        }}
      />
      <Tab.Screen
        name={Routes.CONFIG}
        options={{
          tabBarLabel: strings.navConfig,
          tabBarIcon: ({ focused }) => <TabIcon label="⚙️" focused={focused} />,
        }}
      >
        {() => (
          <ConfigTab
            onRegisterBackHandler={handleRegisterBackHandler}
            onServerCleared={handleServerCleared}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
