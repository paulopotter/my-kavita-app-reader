import { createStyles } from '../../theme';

// The open list never grows past this: more rows scroll inside it.
export const NOTIFICATION_TOAST_LIST_MAX_HEIGHT = 280;

export const notificationToastStyles = createStyles(({ colors, text, spacing, radius, border, alpha }) => ({
  // Floats over the screen without taking touches the pill itself doesn't need: the reader below
  // stays usable.
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  // The app's own background, so it sits in the theme instead of shouting over it; its rows carry
  // the accent. The border is the reader's black — the one colour that never changes — so the card
  // keeps its outline over any page, cover or theme behind it.
  pill: {
    width: '92%',
    borderRadius: radius.large,
    backgroundColor: colors.surface.primary,
    borderWidth: border.medium,
    borderColor: colors.surface.reading.background,
    elevation: 6,
    overflow: 'hidden',
  },
  pillRow: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
  },
  title: { color: colors.text.title.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
  subtitle: { color: colors.text.secondary, fontSize: text.size[2], marginTop: spacing[1] },
  // Text cannot be blurred directly: draw it as a soft shadow of itself instead.
  textBlurred: {
    color: 'transparent',
    textShadowColor: colors.text.secondary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: spacing[3],
  },
  // Sized by its rows, up to the maximum: only then does it scroll.
  list: { flexGrow: 0, maxHeight: NOTIFICATION_TOAST_LIST_MAX_HEIGHT },
  listContent: { paddingHorizontal: spacing[3], paddingBottom: spacing[3] },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.button.primary,
    borderRadius: radius.medium,
    padding: spacing[3],
  },
  groupGap: { marginTop: spacing[2] },
  groupTitle: { color: colors.text.button.primary, fontSize: text.size[3], fontWeight: text.weight.bold },
  groupSubtitle: { color: alpha(colors.text.button.primary, 0.85), fontSize: text.size[2], marginTop: spacing[1] },
  groupTextBlurred: {
    color: 'transparent',
    textShadowColor: colors.text.button.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: spacing[3],
  },
  thumb: { width: 36, height: 54, borderRadius: radius.small, marginRight: spacing[4] },
  thumbPlaceholder: { backgroundColor: alpha(colors.text.button.primary, 0.2) },
  groupBody: { flex: 1 },
  // Closes the open list; sits outside the card, below it, so a swipe up is never the only way out.
  close: {
    marginTop: spacing[3],
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.button.primary,
    borderWidth: border.medium,
    borderColor: colors.surface.reading.background,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
}));
