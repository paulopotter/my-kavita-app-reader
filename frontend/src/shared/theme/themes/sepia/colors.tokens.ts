import type { ThemeColors } from '../../colors.types';

// Sépia — Aged paper: greyed beige with a soft gold accent. The quietest of the warm identities.
//
// Every foreground clears 7:1 against the surface it sits on (WCAG AAA for body text); the
// themes test is what holds that.
export const sepiaColors: ThemeColors = {
  text: {
    primary: 'rgb(238, 232, 222)',
    secondary: 'rgb(190, 178, 162)',
    tertiary: 'rgb(115, 105, 92)',
    ghost: 'rgb(238, 232, 222)',
    emphasis: 'rgb(238, 232, 222)',
    bold: 'rgb(238, 232, 222)',

    title: {
      primary: 'rgb(238, 232, 222)',
      secondary: 'rgb(190, 178, 162)',
    },

    button: {
      primary: 'rgb(32, 26, 16)',
      secondary: 'rgb(238, 232, 222)',
      destructive: 'rgb(238, 232, 222)',
    },

    link: {
      primary: 'rgb(214, 180, 130)',
      secondary: 'rgb(238, 232, 222)',
      destructive: 'rgb(230, 140, 120)',
    },

    input: {
      primary: 'rgb(238, 232, 222)',
      masked: 'rgb(238, 232, 222)',
      placeholder: 'rgb(115, 105, 92)',
    },

    label: 'rgb(238, 232, 222)',

    message: {
      good: 'rgb(140, 190, 130)',
      bad: 'rgb(230, 140, 120)',
    },
  },

  icon: {
    primary: 'rgb(238, 232, 222)',
    secondary: 'rgb(190, 178, 162)',
    tertiary: 'rgb(115, 105, 92)',

    button: {
      primary: 'rgb(32, 26, 16)',
      secondary: 'rgb(214, 180, 130)',
    },

    following: 'rgb(240, 200, 140)',

    status: {
      good: 'rgb(140, 190, 130)',
      off: 'rgb(115, 105, 92)',
      bad: 'rgb(230, 140, 120)',
      unread: 'rgb(214, 180, 130)',
    },

    message: {
      good: 'rgb(140, 190, 130)',
      bad: 'rgb(230, 140, 120)',
    },
  },

  surface: {
    primary: 'rgb(30, 26, 22)',
    secondary: 'rgb(45, 39, 33)',
    tertiary: 'rgb(60, 52, 44)',

    reading: {
      background: 'rgb(0, 0, 0)',
      strip: 'rgb(26, 26, 26)',
    },

    dim: 'rgb(0, 0, 0)',
  },

  button: {
    primary: 'rgb(214, 180, 130)',
    secondary: 'rgb(60, 52, 44)',
    destructive: 'rgb(192, 57, 43)',
    confirmation: 'rgb(140, 190, 130)',
    selected: 'rgb(214, 180, 130)',
    disabled: 'rgb(115, 105, 92)',

    switch: {
      thumb: { on: 'rgb(214, 180, 130)', off: 'rgb(190, 178, 162)' },
      track: { on: 'rgb(82, 68, 46)', off: 'rgb(60, 52, 44)' },
    },
  },

  badge: {
    special: 'rgb(170, 150, 190)',
    error: 'rgb(197, 48, 48)',
  },

  banner: {
    alert: 'rgb(214, 180, 130)',
    notice: 'rgb(214, 180, 130)',
    good: 'rgb(140, 190, 130)',
  },

  border: {
    primary: 'rgb(60, 52, 44)',
    secondary: 'rgb(238, 232, 222)',
    accent: 'rgb(214, 180, 130)',
    disabled: 'rgb(115, 105, 92)',

    input: {
      primary: 'rgb(60, 52, 44)',
      error: 'rgb(230, 140, 120)',
    },

    checkbox: {
      on: 'rgb(214, 180, 130)',
      off: 'rgb(115, 105, 92)',
    },
  },

  progress: {
    primary: 'rgb(214, 180, 130)',
    secondary: 'rgb(238, 232, 222)',

    reading: {
      primary: 'rgb(240, 200, 140)',
      secondary: 'rgb(190, 178, 162)',
    },
  },
};
