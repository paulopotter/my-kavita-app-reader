import type { ThemeColors } from '../../colors.types';

// A second identity, for proving the theme machinery works end to end.
//
// Deep teal surfaces with a cyan accent — deliberately far from the default's indigo/pink, so a
// component that fails to repaint is obvious rather than subtle. Every foreground clears 7:1
// against its surface (WCAG AAA for body text).
export const tealColors: ThemeColors = {
  text: {
    primary: 'rgb(203, 220, 224)',
    secondary: 'rgb(148, 171, 178)',
    tertiary: 'rgb(74, 96, 106)',
    ghost: 'rgb(240, 248, 250)',
    emphasis: 'rgb(240, 248, 250)',
    bold: 'rgb(240, 248, 250)',

    title: {
      primary: 'rgb(240, 248, 250)',
      secondary: 'rgb(148, 171, 178)',
    },

    button: {
      primary: 'rgb(240, 248, 250)',
      secondary: 'rgb(240, 248, 250)',
      destructive: 'rgb(240, 248, 250)',
    },

    link: {
      primary: 'rgb(56, 189, 199)',
      secondary: 'rgb(240, 248, 250)',
      destructive: 'rgb(252, 129, 129)',
    },

    input: {
      primary: 'rgb(240, 248, 250)',
      masked: 'rgb(240, 248, 250)',
      placeholder: 'rgb(74, 96, 106)',
    },

    label: 'rgb(240, 248, 250)',

    message: {
      good: 'rgb(104, 211, 145)',
      bad: 'rgb(252, 129, 129)',
    },
  },

  icon: {
    primary: 'rgb(240, 248, 250)',
    secondary: 'rgb(148, 171, 178)',
    tertiary: 'rgb(74, 96, 106)',

    button: {
      primary: 'rgb(240, 248, 250)',
      secondary: 'rgb(56, 189, 199)',
    },

    following: 'rgb(246, 173, 85)',

    status: {
      good: 'rgb(56, 161, 105)',
      off: 'rgb(74, 96, 106)',
      bad: 'rgb(252, 129, 129)',
      unread: 'rgb(56, 189, 199)',
    },

    message: {
      good: 'rgb(104, 211, 145)',
      bad: 'rgb(252, 129, 129)',
    },
  },

  surface: {
    primary: 'rgb(15, 26, 33)',
    secondary: 'rgb(23, 40, 50)',
    tertiary: 'rgb(32, 58, 71)',

    reading: {
      background: 'rgb(0, 0, 0)',
      strip: 'rgb(26, 26, 26)',
    },

    dim: 'rgb(0, 0, 0)',
  },

  button: {
    primary: 'rgb(56, 189, 199)',
    secondary: 'rgb(38, 64, 77)',
    destructive: 'rgb(192, 57, 43)',
    confirmation: 'rgb(56, 161, 105)',
    selected: 'rgb(56, 189, 199)',
    disabled: 'rgb(74, 96, 106)',

    switch: {
      thumb: { on: 'rgb(56, 189, 199)', off: 'rgb(148, 171, 178)' },
      track: { on: 'rgb(22, 78, 84)', off: 'rgb(32, 58, 71)' },
    },
  },

  badge: {
    special: 'rgb(91, 84, 153)',
    error: 'rgb(197, 48, 48)',
  },

  banner: {
    alert: 'rgb(56, 189, 199)',
    notice: 'rgb(56, 189, 199)',
    good: 'rgb(46, 160, 67)',
  },

  border: {
    primary: 'rgb(32, 58, 71)',
    secondary: 'rgb(240, 248, 250)',
    accent: 'rgb(56, 189, 199)',
    disabled: 'rgb(74, 96, 106)',

    input: {
      primary: 'rgb(32, 58, 71)',
      error: 'rgb(56, 189, 199)',
    },

    checkbox: {
      on: 'rgb(56, 189, 199)',
      off: 'rgb(74, 96, 106)',
    },
  },

  progress: {
    primary: 'rgb(56, 189, 199)',
    secondary: 'rgb(240, 248, 250)',

    reading: {
      primary: 'rgb(246, 173, 85)',
      secondary: 'rgb(148, 171, 178)',
    },
  },
};
