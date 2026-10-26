import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, PanResponder, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import { NOTIFICATION_TOAST_LIST_MAX_HEIGHT, notificationToastStyles } from './notification-toast.styles';
import { useStyles, useTheme } from '../../context';
import { blur, icon } from '../../theme';
import type { NotificationToastGroup, NotificationToastHeadline } from '../../tools/notification-toast';

// Dumb: a thin pill that drops in from the top when something arrives while the app is open, and
// grows into the list of what arrived when tapped. The caller decides when it is visible and
// expanded, builds every string, and handles the taps — this only draws, in the spirit of an
// island that stays out of the way: no backdrop, no scrim, and only the pill itself takes touches.
// Swiping it up closes it, like pushing an island away.
export interface NotificationToastProps {
  visible: boolean;
  expanded: boolean;
  // Distance from the top of the screen — the caller knows the status bar / cutout.
  top: number;
  headline: NotificationToastHeadline;
  groups: NotificationToastGroup[];
  onPress: () => void;
  onGroupPress: (group: NotificationToastGroup) => void;
  onClose: () => void;
  openLabel: string;
  closeLabel: string;
}

const ANIMATION_MS = 180;
const HIDDEN_OFFSET = -80;
// How far (dp) or how fast (dp/ms) an upward drag has to be to count as "push it away".
const SWIPE_CLOSE_DISTANCE = 24;
const SWIPE_CLOSE_VELOCITY = 0.5;
// A drag only takes over from the taps once it is clearly upward.
const SWIPE_START_DISTANCE = 8;

export function isUpwardSwipe({ dx, dy }: { dx: number; dy: number }): boolean {
  return dy < -SWIPE_START_DISTANCE && Math.abs(dy) > Math.abs(dx);
}

export function shouldCloseOnSwipe({ dy, vy }: { dy: number; vy: number }): boolean {
  return dy < -SWIPE_CLOSE_DISTANCE || vy < -SWIPE_CLOSE_VELOCITY;
}

export function NotificationToast({
  visible,
  expanded,
  top,
  headline,
  groups,
  onPress,
  onGroupPress,
  onClose,
  openLabel,
  closeLabel,
}: NotificationToastProps) {
  const { colors } = useTheme();
  const styles = useStyles(notificationToastStyles);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  // The list only scrolls once it has more rows than fit; until then it must not take the vertical
  // drag, which is what closes the card.
  const [scrollable, setScrollable] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    Animated.timing(progress, { toValue: visible ? 1 : 0, duration: ANIMATION_MS, useNativeDriver: true }).start();
  }, [visible, progress]);

  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, { dx, dy }) => isUpwardSwipe({ dx, dy }),
        onPanResponderMove: (_event, { dy }) => drag.setValue(Math.min(0, dy)),
        onPanResponderRelease: (_event, { dy, vy }) => {
          drag.setValue(0);
          if (shouldCloseOnSwipe({ dy, vy })) {onCloseRef.current();}
        },
        onPanResponderTerminate: () => drag.setValue(0),
      }),
    [drag],
  );

  if (!visible && groups.length === 0) {return null;}

  const slide = progress.interpolate({ inputRange: [0, 1], outputRange: [HIDDEN_OFFSET, 0] });

  return (
    <View style={[styles.layer, { top }]} pointerEvents="box-none" testID="notification-toast">
      <Animated.View
        style={[styles.pill, { opacity: progress, transform: [{ translateY: Animated.add(slide, drag) }] }]}
        pointerEvents={visible ? 'auto' : 'none'}
        testID="notification-toast-pill"
        {...swipe.panHandlers}
      >
        <View style={styles.pillRow}>
          <TouchableOpacity
            onPress={expanded ? undefined : onPress}
            activeOpacity={expanded ? 1 : 0.8}
            accessibilityRole="button"
            accessibilityLabel={expanded ? headline.title : openLabel}
            disabled={expanded}
          >
            <Text style={[styles.title, headline.blurred && styles.textBlurred]} numberOfLines={1}>
              {headline.title}
            </Text>
            {headline.subtitle != null && (
              <Text style={[styles.subtitle, headline.blurred && styles.textBlurred]} numberOfLines={1}>
                {headline.subtitle}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        {expanded && (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            scrollEnabled={scrollable}
            onContentSizeChange={(_width, height) => setScrollable(height > NOTIFICATION_TOAST_LIST_MAX_HEIGHT)}
            testID="notification-toast-list"
          >
            {groups.map((group, index) => (
              <TouchableOpacity
                key={group.seriesId}
                style={[styles.group, index > 0 && styles.groupGap]}
                onPress={() => onGroupPress(group)}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Image
                  source={group.coverUrl ? { uri: group.coverUrl } : undefined}
                  style={[styles.thumb, !group.coverUrl && styles.thumbPlaceholder]}
                  resizeMode="cover"
                  blurRadius={group.blurred ? blur.cover : 0}
                  testID={`notification-toast-cover-${group.seriesId}`}
                />
                <View style={styles.groupBody}>
                  <Text style={[styles.groupTitle, group.blurred && styles.groupTextBlurred]} numberOfLines={1}>
                    {group.seriesName}
                  </Text>
                  <Text style={[styles.groupSubtitle, group.blurred && styles.groupTextBlurred]} numberOfLines={1}>
                    {group.bodyText}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </Animated.View>
      {expanded && visible && (
        <TouchableOpacity style={styles.close} onPress={onClose} hitSlop={8} accessibilityLabel={closeLabel}>
          <X size={icon.size[4]} color={colors.icon.button.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
