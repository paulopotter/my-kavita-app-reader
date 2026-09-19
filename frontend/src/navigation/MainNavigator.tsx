import React, { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Bell, Library, Search, Settings, Star } from 'lucide-react-native';
import { Routes } from './routes';
import { LibraryScreen } from '../screens/library';
import { ConfigScreen } from '../screens/config';
import { NotificationsScreen, useUnreadNotificationsCount } from '../screens/notifications';
import { SearchScreen } from '../screens/search';
import { useStartup } from '../shared/context/startup';
import { useStrings } from '../shared/i18n';
import { NotificationsService } from '../shared/services/notifications';
import { alpha, useTheme } from '../shared/theme';

// Whether notifications are enabled right now (the real Android channel's own state — see Plan
// 008 README Decision 10) — read straight from the shared Service, re-checked whenever the app
// returns to foreground (the user may have just come back from the system settings screen). Only
// used here to decide whether the Notifications tab shows at all; the full read/write surface
// (open settings, etc.) belongs to config/notifications' own hook, not duplicated here.
function useNotificationsEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reload = () => {
      NotificationsService.channel.isEnabled().then(setEnabled).catch(() => setEnabled(false));
    };
    reload();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {reload();}
    });
    return () => sub.remove();
  }, []);

  return enabled;
}

const Tab = createBottomTabNavigator();


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
  const { colors } = useTheme();
  const BG = colors.surface.secondary;
  const BORDER = colors.border.primary;
  const ACTIVE = colors.icon.button.secondary;
  const INACTIVE = alpha(colors.text.secondary, 0.45);
  const { refresh, hasFollowedSeries } = useStartup();
  const strings = useStrings();
  const navigation = useNavigation<any>();
  const isConfigSubScreenRef = useRef(false);
  const unreadNotificationsCount = useUnreadNotificationsCount();
  const notificationsEnabled = useNotificationsEnabled();

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
      {/* Following and Library are the same component; the `mode` route param is the only
          difference (followed-only filter + its own prefs scope + nav origin). */}
      {hasFollowedSeries && (
        <Tab.Screen
          name={Routes.FOLLOWING}
          component={LibraryScreen}
          initialParams={{ mode: 'following' }}
          options={{
            tabBarLabel: strings.navFollowing,
            tabBarIcon: ({ focused }) => <Star size={20} color={focused ? ACTIVE : INACTIVE} />,
          }}
        />
      )}
      <Tab.Screen
        name={Routes.LIBRARY}
        component={LibraryScreen}
        initialParams={{ mode: 'library' }}
        options={{
          tabBarLabel: strings.navLibrary,
          tabBarIcon: ({ focused }) => <Library size={20} color={focused ? ACTIVE : INACTIVE} />,
        }}
      />
      <Tab.Screen
        name={Routes.SEARCH}
        component={SearchScreen}
        options={{
          tabBarLabel: strings.navSearch,
          tabBarIcon: ({ focused }) => <Search size={20} color={focused ? ACTIVE : INACTIVE} />,
        }}
      />
      {notificationsEnabled && (
        <Tab.Screen
          name={Routes.NOTIFICATIONS}
          component={NotificationsScreen}
          options={{
            tabBarLabel: strings.navNotifications,
            tabBarBadge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
            tabBarIcon: ({ focused }) => <Bell size={20} color={focused ? ACTIVE : INACTIVE} />,
          }}
        />
      )}
      <Tab.Screen
        name={Routes.CONFIG}
        options={{
          tabBarLabel: strings.navConfig,
          tabBarIcon: ({ focused }) => <Settings size={20} color={focused ? ACTIVE : INACTIVE} />,
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
