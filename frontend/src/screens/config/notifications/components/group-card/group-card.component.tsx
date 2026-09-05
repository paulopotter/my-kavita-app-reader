import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Row } from '../row';
import { styles } from './group-card.styles';

// One notification group: the header (name + ⋯) and its URL list with an add button. Dumb —
// every action is a prop the screen wires to useNotificationGroups.
export interface GroupCardUrl {
  id: string;
  url: string;
  priority: number;
}

export interface GroupCardProps {
  name: string;
  onGroupMenu: () => void;

  urls: GroupCardUrl[];
  canAddUrl: boolean;
  onUrlMenu: (urlId: string) => void;
  onAddUrl: () => void;

  strings: {
    urls: string;
    addUrl: string;
  };
}

export function GroupCard({ name, onGroupMenu, urls, canAddUrl, onUrlMenu, onAddUrl, strings }: GroupCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <TouchableOpacity onPress={onGroupMenu} hitSlop={8}>
          <Text style={styles.dots}>⋯</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.subLabel}>{strings.urls}</Text>
        {urls.map(u => (
          <Row key={u.id} primary={u.url} trailing={`P${u.priority}`} onMenu={() => onUrlMenu(u.id)} />
        ))}

        {canAddUrl && (
          <TouchableOpacity style={styles.addDashedBtn} onPress={onAddUrl}>
            <Text style={styles.addDashedTxt}>{strings.addUrl}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
