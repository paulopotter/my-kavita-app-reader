import type { ThemeColors } from '../../colors.types';

// Vinho — Deep burgundy with a coral accent — the most dramatic of the set, and the only red one
// since crimson stopped being the default.
//
// Every foreground clears 7:1 against the surface it sits on (WCAG AAA for body text); the
// themes test is what holds that.
export const wineColors: ThemeColors = {
  text: {
    primary: 'rgb(242, 228, 232)',
    secondary: 'rgb(196, 166, 174)',
    tertiary: 'rgb(120, 94, 102)',
    ghost: 'rgb(242, 228, 232)',
    emphasis: 'rgb(242, 228, 232)',
    bold: 'rgb(242, 228, 232)',

    title: {
      primary: 'rgb(242, 228, 232)',
      secondary: 'rgb(196, 166, 174)',
    },

    button: {
      primary: 'rgb(40, 8, 16)',
      secondary: 'rgb(242, 228, 232)',
      destructive: 'rgb(242, 228, 232)',
    },

    link: {
      primary: 'rgb(255, 136, 156)',
      secondary: 'rgb(242, 228, 232)',
      destructive: 'rgb(255, 150, 140)',
    },

    input: {
      primary: 'rgb(242, 228, 232)',
      masked: 'rgb(242, 228, 232)',
      placeholder: 'rgb(120, 94, 102)',
    },

    label: 'rgb(242, 228, 232)',

    message: {
      good: 'rgb(130, 200, 140)',
      bad: 'rgb(255, 150, 140)',
    },
  },

  icon: {
    primary: 'rgb(242, 228, 232)',
    secondary: 'rgb(196, 166, 174)',
    tertiary: 'rgb(120, 94, 102)',

    button: {
      primary: 'rgb(40, 8, 16)',
      secondary: 'rgb(255, 136, 156)',
    },

    following: 'rgb(246, 190, 120)',

    status: {
      good: 'rgb(130, 200, 140)',
      off: 'rgb(120, 94, 102)',
      bad: 'rgb(255, 150, 140)',
      unread: 'rgb(255, 136, 156)',
    },

    message: {
      good: 'rgb(130, 200, 140)',
      bad: 'rgb(255, 150, 140)',
    },
  },

  surface: {
    primary: 'rgb(32, 18, 22)',
    secondary: 'rgb(48, 28, 34)',
    tertiary: 'rgb(64, 38, 46)',

    reading: {
      background: 'rgb(0, 0, 0)',
      strip: 'rgb(26, 26, 26)',
    },

    dim: 'rgb(0, 0, 0)',
  },

  button: {
    primary: 'rgb(255, 136, 156)',
    secondary: 'rgb(64, 38, 46)',
    destructive: 'rgb(192, 57, 43)',
    confirmation: 'rgb(130, 200, 140)',
    selected: 'rgb(255, 136, 156)',
    disabled: 'rgb(120, 94, 102)',

    switch: {
      thumb: { on: 'rgb(255, 136, 156)', off: 'rgb(196, 166, 174)' },
      track: { on: 'rgb(96, 36, 48)', off: 'rgb(64, 38, 46)' },
    },
  },

  badge: {
    special: 'rgb(180, 140, 205)',
    error: 'rgb(197, 48, 48)',
  },

  banner: {
    alert: 'rgb(255, 136, 156)',
    warn: 'rgb(238, 188, 96)',
    good: 'rgb(130, 200, 140)',
  },

  border: {
    primary: 'rgb(64, 38, 46)',
    secondary: 'rgb(242, 228, 232)',
    accent: 'rgb(255, 136, 156)',
    disabled: 'rgb(120, 94, 102)',

    input: {
      primary: 'rgb(64, 38, 46)',
      error: 'rgb(255, 150, 140)',
    },

    checkbox: {
      on: 'rgb(255, 136, 156)',
      off: 'rgb(120, 94, 102)',
    },
  },

  progress: {
    primary: 'rgb(255, 136, 156)',
    secondary: 'rgb(242, 228, 232)',

    reading: {
      primary: 'rgb(246, 190, 120)',
      secondary: 'rgb(196, 166, 174)',
    },
  },
};

// The same identity with its floor on real black: on an OLED panel an unlit pixel costs no
// power and the contrast is absolute. Only the surfaces move, and the whole ladder moves together
// — dropping just the background would widen the gap to the card, which reads as the card
// floating rather than sitting on the screen.
export const wineOledColors: ThemeColors = {
  ...wineColors,
  surface: {
    ...wineColors.surface,
    primary: 'rgb(0, 0, 0)',
    secondary: 'rgb(22, 13, 16)',
    tertiary: 'rgb(38, 22, 27)',
  },
};
