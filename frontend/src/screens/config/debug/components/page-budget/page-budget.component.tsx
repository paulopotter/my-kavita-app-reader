import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useStyles } from '../../../../../shared/context';
import { pageBudgetStyles } from './page-budget.styles';

// Dumb picker for the reader's decoded-page size budget (debug menu): a title, a hint and one
// button per option. Holds no state — the screen's hook owns the value and the write.
export interface PageBudgetProps {
  title: string;
  hint: string;
  value: number | null;
  options: number[];
  onSelect: (mb: number) => void;
}

export function PageBudget({ title, hint, value, options, onSelect }: PageBudgetProps) {
  const styles = useStyles(pageBudgetStyles);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
      <View style={styles.options}>
        {options.map(mb => {
          const selected = mb === value;
          return (
            <TouchableOpacity
              key={mb}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => onSelect(mb)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${mb} MB`}>
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{`${mb} MB`}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
