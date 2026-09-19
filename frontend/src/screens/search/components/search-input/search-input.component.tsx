import React from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { searchInputStyles } from './search-input.styles';
import { ColorTool } from '../../../../shared/theme';
import { useTheme, useStyles } from '../../../../shared/context';

// Dumb component: primitives + callbacks + render only. Holds no i18n (the placeholder and the
// clear button's label arrive as strings) and no filtering logic.
export interface SearchInputProps {
  value: string;
  placeholder: string;
  clearAccessibilityLabel: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, placeholder, clearAccessibilityLabel, onChange }: SearchInputProps) {
  const { colors } = useTheme();
  const styles = useStyles(searchInputStyles);
  return (
    <View style={styles.root}>
      <Search size={18} color={colors.icon.secondary} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={ColorTool.add.alpha(colors.text.input.placeholder, 0.4)}
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
