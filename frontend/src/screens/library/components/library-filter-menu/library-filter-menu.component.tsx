import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { libraryFilterMenuStyles } from './library-filter-menu.styles';
import { useTheme, useStyles } from '../../../../shared/context';
import { icon } from '../../../../shared/theme';
import type { Strings } from '../../../../shared/i18n';
import type { LibraryReadStatusFilter } from '../../library.types';

const OPTIONS: { value: LibraryReadStatusFilter; label: (t: Strings) => string }[] = [
  { value: 'UNREAD', label: t => t.readStatusUnread },
  { value: 'IN_PROGRESS', label: t => t.readStatusReading },
  { value: 'READ', label: t => t.readStatusRead },
];

export interface LibraryFilterMenuProps {
  visible: boolean;
  active: ReadonlySet<LibraryReadStatusFilter>;
  t: Strings;
  onClose: () => void;
  onToggle: (value: LibraryReadStatusFilter) => void;
  onClear: () => void;
}

// A read-status filter for the Library/Following list — one checkbox row per status, multi-
// select (empty = no filter, show everything). A top sheet spanning the screen's own width,
// dropping from just below the header (not a popover anchored under a button — see the styles
// file for why). No animation: `animationType="slide"` always drives the Android Dialog up from
// the bottom regardless of where the content is anchored, so it fought this top sheet instead of
// matching it — cut rather than fought. Session-only: the screen holds `active` in plain
// useState, so it resets the moment this screen unmounts (leaving the tab) — see
// library.types.ts's own doc on LibraryReadStatusFilter for why that's deliberate.
export function LibraryFilterMenu({ visible, active, t, onClose, onToggle, onClear }: LibraryFilterMenuProps) {
  const { colors } = useTheme();
  const styles = useStyles(libraryFilterMenuStyles);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{t.libraryFilterMenuTitle}</Text>
          {OPTIONS.map(option => {
            const checked = active.has(option.value);
            return (
              <Pressable
                key={option.value}
                style={styles.item}
                onPress={() => onToggle(option.value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}>
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked && <Check size={icon.size[2]} color={colors.text.button.primary} />}
                </View>
                <Text style={styles.itemText}>{option.label(t)}</Text>
              </Pressable>
            );
          })}
          <View style={styles.divider} />
          <Pressable
            style={styles.clearBtn}
            onPress={onClear}
            disabled={active.size === 0}
            accessibilityRole="button">
            <Text style={[styles.clearBtnText, active.size === 0 && styles.clearBtnDisabled]}>
              {t.libraryFilterClearAll}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
