import type { ThemeColors } from '../../colors.types';

// A second identity, for proving the theme machinery works end to end.
//
// Deep teal surfaces with a cyan accent — deliberately far from crimson's indigo/pink, so a
// component that fails to repaint is obvious rather than subtle.
//
// Drawn before there was a measured bar, and two pairs sit just under AAA: secondary text reads
// 6.30 against the card and the cyan link 6.69. Both were approved on the device as they are, and
// the themes test records them as inherited rather than pretending otherwise.
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
    alert: 'rgb(226, 86, 92)',
    warn: 'rgb(232, 182, 76)',
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
      // The identity's own cyan, not the amber this started as — the reader's progress is this
      // theme's accent, the same colour its buttons and links use.
      primary: 'rgb(56, 189, 199)',
      secondary: 'rgb(148, 171, 178)',
    },
  },
};

// The same identity with its floor on real black: on an OLED panel an unlit pixel costs no power
// and the contrast is absolute. Only the surfaces move, and the whole ladder moves together —
// dropping just the background would widen the gap to the card, which reads as the card floating
// rather than sitting on the screen.
export const tealOledColors: ThemeColors = {
  ...tealColors,
  surface: {
    ...tealColors.surface,
    primary: 'rgb(0, 0, 0)',
    secondary: 'rgb(11, 19, 24)',
    tertiary: 'rgb(19, 34, 42)',
  },
};
