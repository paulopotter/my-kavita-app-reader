import { createStyles } from '../../../../shared/theme';

export const backChevronStyles = createStyles(({ spacing }) => ({
  // The header already insets by the gutter; the negative margin pulls the touch target back out
  // so the glyph — not its padding — is what lines up with everything below it.
  hitArea: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    marginLeft: -spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
