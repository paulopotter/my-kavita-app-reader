import React, { useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './select.styles';

// A single-choice select: a trigger showing the current label, tap to open a sheet listing every
// option one per row. No native picker dependency; scales to a long option list, unlike chips.
export interface SelectOption {
  id: string | undefined;
  label: string;
}

export interface SelectProps {
  value: string | undefined;
  options: SelectOption[];
  placeholder?: string;
  onChange: (id: string | undefined) => void;
}

// `placeholder` is always passed by the caller (a translated string); the default is only a
// last-resort fallback.
export function Select({ value, options, placeholder = '—', onChange }: SelectProps) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.id === value);

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={[styles.triggerTxt, !current && styles.triggerPlaceholder]} numberOfLines={1}>
          {current?.label ?? placeholder}
        </Text>
        <Text style={styles.caret}>▾</Text>
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <ScrollView>
              {options.map((o, i) => {
                const active = o.id === value;
                return (
                  <View key={o.id ?? '__none__'}>
                    {i > 0 && <View style={styles.divider} />}
                    <TouchableOpacity
                      style={[styles.option, active && styles.optionActive]}
                      onPress={() => {
                        onChange(o.id);
                        setOpen(false);
                      }}>
                      <Text style={[styles.optionTxt, active && styles.optionTxtActive]} numberOfLines={1}>
                        {o.label}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
