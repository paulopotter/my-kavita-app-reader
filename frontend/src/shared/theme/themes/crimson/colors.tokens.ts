import type { ThemeColors } from '../../colors.types';

// Deep navy with a crimson accent — the app's original identity, and what it shipped with before
// there was more than one.
//
// Values are frozen: this file is the result of two earlier passes (centralising every literal,
// then converging near-identical tones), and the device already approved them. What each field
// *means* is documented once, on the contract in `colors.types.ts` — not repeated here, so the two
// can never drift apart.
//
// Several fields share a value today (title.primary, emphasis, bold, label and input.primary are
// all #FFFFFF). They stay separate because a different identity may want to move one without the
// others: colouring the screen's heading is not the same decision as colouring bold text inside a
// paragraph.
export const crimsonColors: ThemeColors = {
  text: {
    primary: 'rgb(203, 213, 224)',
    secondary: 'rgb(160, 174, 192)',
    tertiary: 'rgb(74, 85, 104)',
    ghost: 'rgb(255, 255, 255)',
    emphasis: 'rgb(255, 255, 255)',
    bold: 'rgb(255, 255, 255)',

    title: {
      primary: 'rgb(255, 255, 255)',
      secondary: 'rgb(160, 174, 192)',
    },

    button: {
      primary: 'rgb(255, 255, 255)',
      secondary: 'rgb(255, 255, 255)',
      destructive: 'rgb(255, 255, 255)',
    },

    link: {
      primary: 'rgb(233, 69, 96)',
      secondary: 'rgb(255, 255, 255)',
      destructive: 'rgb(252, 129, 129)',
    },

    input: {
      primary: 'rgb(255, 255, 255)',
      masked: 'rgb(255, 255, 255)',
      placeholder: 'rgb(74, 85, 104)',
    },

    label: 'rgb(255, 255, 255)',

    message: {
      good: 'rgb(104, 211, 145)',
      bad: 'rgb(252, 129, 129)',
    },
  },

  icon: {
    primary: 'rgb(255, 255, 255)',
    secondary: 'rgb(160, 174, 192)',
    tertiary: 'rgb(74, 85, 104)',

    button: {
      primary: 'rgb(255, 255, 255)',
      secondary: 'rgb(233, 69, 96)',
    },

    following: 'rgb(255, 193, 7)',

    status: {
      good: 'rgb(56, 161, 105)',
      off: 'rgb(74, 85, 104)',
      bad: 'rgb(252, 129, 129)',
      unread: 'rgb(233, 69, 96)',
    },

    message: {
      good: 'rgb(104, 211, 145)',
      bad: 'rgb(252, 129, 129)',
    },
  },

  surface: {
    primary: 'rgb(26, 26, 46)',
    secondary: 'rgb(22, 33, 62)',
    tertiary: 'rgb(15, 52, 96)',

    reading: {
      background: 'rgb(0, 0, 0)',
      strip: 'rgb(26, 26, 26)',
    },

    dim: 'rgb(0, 0, 0)',
  },

  button: {
    primary: 'rgb(233, 69, 96)',
    secondary: 'rgb(45, 55, 72)',
    destructive: 'rgb(192, 57, 43)',
    confirmation: 'rgb(56, 161, 105)',
    selected: 'rgb(233, 69, 96)',
    disabled: 'rgb(74, 85, 104)',

    switch: {
      thumb: { on: 'rgb(233, 69, 96)', off: 'rgb(160, 174, 192)' },
      track: { on: 'rgb(127, 29, 29)', off: 'rgb(15, 52, 96)' },
    },
  },

  badge: {
    special: 'rgb(85, 60, 154)',
    error: 'rgb(197, 48, 48)',
  },

  banner: {
    alert: 'rgb(233, 69, 96)',
    warn: 'rgb(240, 176, 68)',
    good: 'rgb(46, 160, 67)',
  },

  border: {
    primary: 'rgb(15, 52, 96)',
    secondary: 'rgb(255, 255, 255)',
    accent: 'rgb(233, 69, 96)',
    disabled: 'rgb(74, 85, 104)',

    input: {
      primary: 'rgb(15, 52, 96)',
      error: 'rgb(233, 69, 96)',
    },

    checkbox: {
      on: 'rgb(233, 69, 96)',
      off: 'rgb(74, 85, 104)',
    },
  },

  progress: {
    primary: 'rgb(233, 69, 96)',
    secondary: 'rgb(255, 255, 255)',

    reading: {
      // The identity's own pink/red, not a generic gold — the reader's progress is this theme's
      // accent, the same colour its buttons and links use.
      primary: 'rgb(233, 69, 96)',
      secondary: 'rgb(160, 174, 192)',
    },
  },
};

// The same identity with its floor on real black: on an OLED panel an unlit pixel costs no power
// and the contrast is absolute. Only the surfaces move, and the whole ladder moves together —
// dropping just the background would widen the gap to the card, which reads as the card floating
// rather than sitting on the screen.
export const crimsonOledColors: ThemeColors = {
  ...crimsonColors,
  surface: {
    ...crimsonColors.surface,
    primary: 'rgb(0, 0, 0)',
    secondary: 'rgb(12, 14, 30)',
    tertiary: 'rgb(26, 33, 46)',
  },
};
