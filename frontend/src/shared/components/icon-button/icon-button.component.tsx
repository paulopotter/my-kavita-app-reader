import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useStyles } from '../../context';
import { gutter, spacing } from '../../theme';
import { iconButtonStyles } from './icon-button.styles';
import { GLYPH_INSET, type GlyphName } from './icon-button.glyphs';

// Keeps the tappable area comfortable even when the glyph itself is small.
const HIT_SLOP = { top: spacing[5], bottom: spacing[5], left: spacing[5], right: spacing[5] };

// Clamp the tooltip's own box against the window edges so a button near a corner never draws it
// partly off-screen — the same gutter every screen already opens with, not a one-off margin.
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Long enough to move the thumb off the button and actually read the label, short enough not to
// linger. Fades out over the last part of it rather than vanishing the instant the finger lifts.
const TOOLTIP_VISIBLE_MS = 2000;
const TOOLTIP_FADE_MS = 300;

export interface IconButtonProps {
  /** The Lucide icon to draw. */
  icon: LucideIcon;
  /** Which glyph it is, so its own empty margin can be discounted — see icon-button.glyphs. */
  glyph: GlyphName;
  size: number;
  color: string;
  onPress?: () => void;
  /**
   * Every icon button in the app carries one — it is both the screen-reader label and, on
   * long-press, the tooltip text (the glyph alone rarely says what the action is). There is no
   * way to opt out: an icon with no way to ask what it does is the bug this prop exists to rule
   * out everywhere at once, not just in whichever screen last remembered to add it.
   */
  accessibilityLabel: string;
  /**
   * Pull the button left by the glyph's empty margin, so the STROKE — not the box around it —
   * lines up with whatever the container insets by. For an icon in a corner with content below
   * it; without this the icon reads as pushed further in than everything else.
   */
  alignStroke?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A tappable icon that can line its stroke up with the content around it, and always answers
 * "what is this" on long-press.
 *
 * A Lucide glyph is drawn inside a 24-unit box and none of them fill it: a chevron leaves 9 units
 * empty on each side, an arrow 5, a circle 2. So placing the BOX at the gutter leaves the visible
 * stroke short of it by that much — which is why `alignStroke` exists, and why the amount depends
 * on which glyph is being drawn rather than being one number for every icon.
 */
export function IconButton({
  icon: Icon,
  glyph,
  size,
  color,
  onPress,
  accessibilityLabel,
  alignStroke,
  style,
}: IconButtonProps) {
  const styles = useStyles(iconButtonStyles);
  const inset = alignStroke ? Math.round(size * GLYPH_INSET[glyph]) : 0;

  const touchableRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; height: number; width: number } | null>(null);
  // The tooltip's own box, measured once it renders, so it can be centred under the button by an
  // exact pixel offset (rather than a CSS percentage transform, unreliable across RN versions)
  // and clamped against the screen edges near a corner.
  const [tooltipBox, setTooltipBox] = useState({ width: 0, height: 0 });
  const fade = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideTooltip = () => {
    if (hideTimer.current) {clearTimeout(hideTimer.current);}
    setAnchor(null);
    setTooltipBox({ width: 0, height: 0 });
  };

  // Measured on the long-press itself, not on mount/layout — the earlier attempt to anchor a
  // popover via measureInWindow raced the native touch-feedback pass at mount time and could read
  // a stale/zeroed layout. Measuring inside the already-recognized long-press gesture instead
  // means the view has settled, so this doesn't repeat that bug.
  const showTooltip = () => {
    touchableRef.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
  };

  // Auto-dismiss on a timer instead of on release: releasing the finger is the moment the user
  // can finally SEE the tooltip (their thumb was covering it), so hiding right then defeated the
  // whole point. Fades out instead of vanishing outright.
  useEffect(() => {
    if (anchor == null) {return;}
    fade.setValue(1);
    hideTimer.current = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: TOOLTIP_FADE_MS, useNativeDriver: true }).start(() =>
        hideTooltip(),
      );
    }, TOOLTIP_VISIBLE_MS);
    return () => {
      if (hideTimer.current) {clearTimeout(hideTimer.current);}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  return (
    <>
      <TouchableOpacity
        ref={touchableRef}
        onPress={onPress}
        onLongPress={showTooltip}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={HIT_SLOP}
        style={[styles.button, alignStroke && { marginLeft: -inset, marginRight: -inset }, style]}>
        <Icon size={size} color={color} />
      </TouchableOpacity>
      {/* A transparent Modal, not an absolutely-positioned sibling View: on Android, zIndex and
          elevation only reorder views under the same direct parent, so a popover living in one
          screen's view tree can never reliably paint above another subtree (e.g. a list below
          it). A Modal opens its own native Window, always on top regardless of where it's
          declared. No entry animation — `animationType="slide"` always drives the Android Dialog
          up from the bottom, which fights a tooltip that should just appear where it's anchored;
          the fade-out on dismiss is handled by hand via `fade` instead. */}
      <Modal visible={anchor != null} transparent animationType="none" onRequestClose={hideTooltip}>
        <View style={styles.tooltipLayer} pointerEvents="none">
          {anchor && (() => {
            const window = Dimensions.get('window');
            // Below the button's own measured height (not the glyph's `size`), so the tooltip
            // clears the whole tappable area instead of hugging the icon — then pulled back
            // inside the screen's gutter on every edge, so a button near a corner never draws
            // it partly off-screen.
            const idealLeft = anchor.x + anchor.width / 2 - tooltipBox.width / 2;
            const idealTop = anchor.y + anchor.height;
            const left = clamp(idealLeft, gutter, window.width - tooltipBox.width - gutter);
            const top = clamp(idealTop, gutter, window.height - tooltipBox.height - gutter);
            return (
              <Animated.View
                onLayout={e => setTooltipBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
                style={[styles.tooltip, { position: 'absolute', top, left, opacity: fade }]}>
                <Text style={styles.tooltipText}>{accessibilityLabel}</Text>
              </Animated.View>
            );
          })()}
        </View>
      </Modal>
    </>
  );
}
