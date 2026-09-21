import type { ThemeColors } from '../../colors.types';

// Âmbar — Warm browns with an amber accent — no blue at all, which is what makes it the easiest on
// the eyes at night.
//
// Every foreground clears 7:1 against the surface it sits on (WCAG AAA for body text); the
// themes test is what holds that.
export const amberColors: ThemeColors = {
  text: {
    primary: 'rgb(240, 232, 220)',
    secondary: 'rgb(187, 172, 152)',
    tertiary: 'rgb(112, 100, 86)',
    ghost: 'rgb(240, 232, 220)',
    emphasis: 'rgb(240, 232, 220)',
    bold: 'rgb(240, 232, 220)',

    title: {
      primary: 'rgb(240, 232, 220)',
      secondary: 'rgb(187, 172, 152)',
    },

    button: {
      primary: 'rgb(35, 24, 6)',
      secondary: 'rgb(240, 232, 220)',
      destructive: 'rgb(240, 232, 220)',
    },

    link: {
      primary: 'rgb(240, 165, 60)',
      secondary: 'rgb(240, 232, 220)',
      destructive: 'rgb(240, 130, 110)',
    },

    input: {
      primary: 'rgb(240, 232, 220)',
      masked: 'rgb(240, 232, 220)',
      placeholder: 'rgb(112, 100, 86)',
    },

    label: 'rgb(240, 232, 220)',

    message: {
      good: 'rgb(120, 190, 120)',
      bad: 'rgb(240, 130, 110)',
    },
  },

  icon: {
    primary: 'rgb(240, 232, 220)',
    secondary: 'rgb(187, 172, 152)',
    tertiary: 'rgb(112, 100, 86)',

    button: {
      primary: 'rgb(35, 24, 6)',
      secondary: 'rgb(240, 165, 60)',
    },

    following: 'rgb(250, 200, 120)',

    status: {
      good: 'rgb(120, 190, 120)',
      off: 'rgb(112, 100, 86)',
      bad: 'rgb(240, 130, 110)',
      unread: 'rgb(240, 165, 60)',
    },

    message: {
      good: 'rgb(120, 190, 120)',
      bad: 'rgb(240, 130, 110)',
    },
  },

  surface: {
    primary: 'rgb(28, 23, 18)',
    secondary: 'rgb(42, 34, 26)',
    tertiary: 'rgb(56, 46, 36)',

    reading: {
      background: 'rgb(0, 0, 0)',
      strip: 'rgb(26, 26, 26)',
    },

    dim: 'rgb(0, 0, 0)',
  },

  button: {
    primary: 'rgb(240, 165, 60)',
    secondary: 'rgb(56, 46, 36)',
    destructive: 'rgb(192, 57, 43)',
    confirmation: 'rgb(120, 190, 120)',
    selected: 'rgb(240, 165, 60)',
    disabled: 'rgb(112, 100, 86)',

    switch: {
      thumb: { on: 'rgb(240, 165, 60)', off: 'rgb(187, 172, 152)' },
      track: { on: 'rgb(92, 62, 18)', off: 'rgb(56, 46, 36)' },
    },
  },

  badge: {
    special: 'rgb(180, 140, 200)',
    error: 'rgb(197, 48, 48)',
  },

  banner: {
    alert: 'rgb(224, 82, 72)',
    warn: 'rgb(240, 180, 70)',
    good: 'rgb(120, 190, 120)',
  },

  border: {
    primary: 'rgb(56, 46, 36)',
    secondary: 'rgb(240, 232, 220)',
    accent: 'rgb(240, 165, 60)',
    disabled: 'rgb(112, 100, 86)',

    input: {
      primary: 'rgb(56, 46, 36)',
      error: 'rgb(240, 130, 110)',
    },

    checkbox: {
      on: 'rgb(240, 165, 60)',
      off: 'rgb(112, 100, 86)',
    },
  },

  progress: {
    primary: 'rgb(240, 165, 60)',
    secondary: 'rgb(240, 232, 220)',

    reading: {
      primary: 'rgb(250, 200, 120)',
      secondary: 'rgb(187, 172, 152)',
    },
  },
};
