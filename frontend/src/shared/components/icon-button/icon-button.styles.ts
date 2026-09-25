import { createStyles } from '../../theme';

export const iconButtonStyles = createStyles(({ colors, text, spacing, radius }) => ({
  button: { alignItems: 'center', justifyContent: 'center' },
  // Fills the whole transparent Modal so the tooltip can be positioned anywhere in it via
  // absolute coordinates measured off the button itself.
  tooltipLayer: { flex: 1 },
  tooltip: {
    // The theme's own accent fill, not a surface tone — a tooltip needs to stand OUT against
    // whatever's behind it, in either a light or a dark theme, which a surface colour (drawn
    // from the same neutral scale as the screen it sits on) can't guarantee. `button.primary` is
    // the one colour every theme already contrasts its own surfaces against.
    backgroundColor: colors.button.primary,
    borderRadius: radius.small,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    marginTop: spacing[2],
    // Keeps the tooltip readable regardless of the label's length, without wrapping awkwardly
    // against the screen edge.
    minWidth: 120,
    alignItems: 'center',
    // Belt-and-suspenders: the Modal's own Window already paints above the rest of the app, so
    // this shouldn't be load-bearing — but if two Modals ever end up alive at once (e.g. this one
    // opening while another is still tearing down), the higher zIndex/elevation is what decides
    // which Window wins the overlap.
    zIndex: 99999,
    elevation: 99999,
  },
  tooltipText: { color: colors.text.button.primary, fontSize: text.size[2], fontWeight: text.weight.bold },
}));
