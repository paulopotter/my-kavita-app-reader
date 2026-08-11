import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useStrings } from '../i18n/useStrings';

export type Tab = 'library' | 'settings';

interface Props {
  activeTab: Tab;
  onTabPress: (tab: Tab) => void;
}

export function BottomBar({ activeTab, onTabPress }: Props) {
  const t = useStrings();

  return (
    <View style={styles.bar}>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => onTabPress('library')}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'library' }}>
        <Text style={[styles.icon, activeTab === 'library' && styles.activeIcon]}>
          📚
        </Text>
        <Text style={[styles.label, activeTab === 'library' && styles.activeLabel]}>
          {t.bottomBarLibrary}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => onTabPress('settings')}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'settings' }}>
        <Text style={[styles.icon, activeTab === 'settings' && styles.activeIcon]}>
          ⚙️
        </Text>
        <Text style={[styles.label, activeTab === 'settings' && styles.activeLabel]}>
          {t.bottomBarSettings}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#16213E',
    borderTopWidth: 1,
    borderTopColor: '#0F3460',
    height: 60,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  icon: {
    fontSize: 20,
    opacity: 0.5,
  },
  activeIcon: {
    opacity: 1,
  },
  label: {
    color: '#A0AEC0',
    fontSize: 11,
  },
  activeLabel: {
    color: '#E94560',
    fontWeight: '600',
  },
});
