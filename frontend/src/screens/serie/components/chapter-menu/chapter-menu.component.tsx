import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { ArrowUpDown, ListChecks } from 'lucide-react-native';
import type { Strings } from '../../../../shared/i18n';
import { chapterMenuStyles } from './chapter-menu.styles';
import { useTheme, useStyles } from '../../../../shared/context';
import { icon } from '../../../../shared/theme';

// Where the menu card should render, measured from the ⋮ button that opens it (see
// serie.screen.tsx's onLayout/measureInWindow call) — null while not yet measured, in which case
// the menu simply doesn't open yet (see `visible` below).
export interface ChapterMenuAnchor {
  top: number;
  right: number;
}

// The chapter list's own overflow menu (⋮ in the sortBar) — everything that used to be separate
// buttons (sort config, range selection) now opens from here. Dumb: it only reports which item
// was picked; the screen decides what opening that item means (which modal to show), and where
// on screen the button that opened it actually is (anchor).
export interface ChapterMenuProps {
  visible: boolean;
  anchor: ChapterMenuAnchor | null;
  t: Strings;
  onClose: () => void;
  onSelectSort: () => void;
  onSelectRange: () => void;
}

export function ChapterMenu({ visible, anchor, t, onClose, onSelectSort, onSelectRange }: ChapterMenuProps) {
  const { colors } = useTheme();
  const styles = useStyles(chapterMenuStyles);

  // Not measured yet — nothing to anchor to, so there is nothing correct to show. The screen
  // only flips `visible` true once it already has a fresh measurement (see its onPress handler).
  if (!anchor) {return null;}

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.card, { top: anchor.top, right: anchor.right }]}>
          <Pressable
            style={styles.item}
            onPress={() => {
              onClose();
              onSelectSort();
            }}>
            <ArrowUpDown size={icon.size[4]} color={colors.icon.secondary} />
            <Text style={styles.itemText}>{t.seriesDetailChapterMenuSort}</Text>
          </Pressable>
          <Pressable
            style={styles.item}
            onPress={() => {
              onClose();
              onSelectRange();
            }}>
            <ListChecks size={icon.size[4]} color={colors.icon.secondary} />
            <Text style={styles.itemText}>{t.seriesDetailChapterMenuRange}</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
