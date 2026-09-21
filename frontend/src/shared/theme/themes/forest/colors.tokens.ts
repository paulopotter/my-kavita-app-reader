import type { ThemeColors } from '../../colors.types';

// Floresta — Deep forest green with a mint accent — the family none of the others cover, and easy on
// the eyes over a long read.
//
// Every foreground clears 7:1 against the surface it sits on (WCAG AAA for body text); the
// themes test is what holds that.
export const forestColors: ThemeColors = {
  text: {
    primary: 'rgb(228, 240, 232)',
    secondary: 'rgb(158, 183, 168)',
    tertiary: 'rgb(96, 118, 106)',
    ghost: 'rgb(228, 240, 232)',
    emphasis: 'rgb(228, 240, 232)',
    bold: 'rgb(228, 240, 232)',

    title: {
      primary: 'rgb(228, 240, 232)',
      secondary: 'rgb(158, 183, 168)',
    },

    button: {
      primary: 'rgb(6, 30, 16)',
      secondary: 'rgb(228, 240, 232)',
      destructive: 'rgb(228, 240, 232)',
    },

    link: {
      primary: 'rgb(94, 200, 130)',
      secondary: 'rgb(228, 240, 232)',
      destructive: 'rgb(240, 130, 120)',
    },

    input: {
      primary: 'rgb(228, 240, 232)',
      masked: 'rgb(228, 240, 232)',
      placeholder: 'rgb(96, 118, 106)',
    },

    label: 'rgb(228, 240, 232)',

    message: {
      good: 'rgb(120, 210, 140)',
      bad: 'rgb(240, 130, 120)',
    },
  },

  icon: {
    primary: 'rgb(228, 240, 232)',
    secondary: 'rgb(158, 183, 168)',
    tertiary: 'rgb(96, 118, 106)',

    button: {
      primary: 'rgb(6, 30, 16)',
      secondary: 'rgb(94, 200, 130)',
    },

    following: 'rgb(246, 190, 110)',

    status: {
      good: 'rgb(120, 210, 140)',
      off: 'rgb(96, 118, 106)',
      bad: 'rgb(240, 130, 120)',
      unread: 'rgb(94, 200, 130)',
    },

    message: {
      good: 'rgb(120, 210, 140)',
      bad: 'rgb(240, 130, 120)',
    },
  },

  surface: {
    primary: 'rgb(16, 28, 22)',
    secondary: 'rgb(26, 42, 34)',
    tertiary: 'rgb(36, 56, 46)',

    reading: {
      background: 'rgb(0, 0, 0)',
      strip: 'rgb(26, 26, 26)',
    },

    dim: 'rgb(0, 0, 0)',
  },

  button: {
    primary: 'rgb(94, 200, 130)',
    secondary: 'rgb(36, 56, 46)',
    destructive: 'rgb(192, 57, 43)',
    confirmation: 'rgb(120, 210, 140)',
    selected: 'rgb(94, 200, 130)',
    disabled: 'rgb(96, 118, 106)',

    switch: {
      thumb: { on: 'rgb(94, 200, 130)', off: 'rgb(158, 183, 168)' },
      track: { on: 'rgb(28, 74, 48)', off: 'rgb(36, 56, 46)' },
    },
  },

  badge: {
    special: 'rgb(150, 150, 215)',
    error: 'rgb(197, 48, 48)',
  },

  banner: {
    alert: 'rgb(216, 90, 82)',
    warn: 'rgb(226, 184, 80)',
    good: 'rgb(120, 210, 140)',
  },

  border: {
    primary: 'rgb(36, 56, 46)',
    secondary: 'rgb(228, 240, 232)',
    accent: 'rgb(94, 200, 130)',
    disabled: 'rgb(96, 118, 106)',

    input: {
      primary: 'rgb(36, 56, 46)',
      error: 'rgb(240, 130, 120)',
    },

    checkbox: {
      on: 'rgb(94, 200, 130)',
      off: 'rgb(96, 118, 106)',
    },
  },

  progress: {
    primary: 'rgb(94, 200, 130)',
    secondary: 'rgb(228, 240, 232)',

    reading: {
      primary: 'rgb(246, 190, 110)',
      secondary: 'rgb(158, 183, 168)',
    },
  },
};

// The same identity with its floor on real black: on an OLED panel an unlit pixel costs no
// power and the contrast is absolute. Only the surfaces move, and the whole ladder moves together
// — dropping just the background would widen the gap to the card, which reads as the card
// floating rather than sitting on the screen.
export const forestOledColors: ThemeColors = {
  ...forestColors,
  surface: {
    ...forestColors.surface,
    primary: 'rgb(0, 0, 0)',
    secondary: 'rgb(12, 20, 16)',
    tertiary: 'rgb(22, 34, 28)',
  },
};
