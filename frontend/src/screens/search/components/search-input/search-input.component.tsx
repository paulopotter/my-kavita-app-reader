import React from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { styles } from './search-input.styles';
import { colors, alpha } from '../../../../shared/theme';

// Dumb component: primitives + callbacks + render only. Holds no i18n (the placeholder and the
// clear button's label arrive as strings) and no filtering logic.
export interface SearchInputProps {
  value: string;
  placeholder: string;
  clearAccessibilityLabel: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, placeholder, clearAccessibilityLabel, onChange }: SearchInputProps) {
  return (
    <View style={styles.root}>
      <Search size={18} color={colors.icon.secondary} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={alpha(colors.text.input.placeholder, 0.35)}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChange('')}
          accessibilityRole="button"
          accessibilityLabel={clearAccessibilityLabel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={18} color={colors.icon.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
