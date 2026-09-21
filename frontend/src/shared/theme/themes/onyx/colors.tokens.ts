import type { ThemeColors } from '../../colors.types';

// Ônix — Pure black for OLED panels, where an unlit pixel costs nothing and the contrast is
// absolute. Ice-blue accent, chosen to carry over a black floor. Text is 235, not 255: white on
// pure black haloes for astigmatic eyes.
//
// Every foreground clears 7:1 against the surface it sits on (WCAG AAA for body text); the
// themes test is what holds that.
export const onyxColors: ThemeColors = {
  text: {
    primary: 'rgb(235, 235, 235)',
    secondary: 'rgb(160, 160, 160)',
    tertiary: 'rgb(95, 95, 95)',
    ghost: 'rgb(235, 235, 235)',
    emphasis: 'rgb(235, 235, 235)',
    bold: 'rgb(235, 235, 235)',

    title: {
      primary: 'rgb(235, 235, 235)',
      secondary: 'rgb(160, 160, 160)',
    },

    button: {
      primary: 'rgb(0, 20, 35)',
      secondary: 'rgb(235, 235, 235)',
      destructive: 'rgb(235, 235, 235)',
    },

    link: {
      primary: 'rgb(120, 200, 255)',
      secondary: 'rgb(235, 235, 235)',
      destructive: 'rgb(240, 120, 120)',
    },

    input: {
      primary: 'rgb(235, 235, 235)',
      masked: 'rgb(235, 235, 235)',
      placeholder: 'rgb(95, 95, 95)',
    },

    label: 'rgb(235, 235, 235)',

    message: {
      good: 'rgb(74, 190, 110)',
      bad: 'rgb(240, 120, 120)',
    },
  },

  icon: {
    primary: 'rgb(235, 235, 235)',
    secondary: 'rgb(160, 160, 160)',
    tertiary: 'rgb(95, 95, 95)',

    button: {
      primary: 'rgb(0, 20, 35)',
      secondary: 'rgb(120, 200, 255)',
    },

    following: 'rgb(246, 173, 85)',

    status: {
      good: 'rgb(74, 190, 110)',
      off: 'rgb(95, 95, 95)',
      bad: 'rgb(240, 120, 120)',
      unread: 'rgb(120, 200, 255)',
    },

    message: {
      good: 'rgb(74, 190, 110)',
      bad: 'rgb(240, 120, 120)',
    },
  },

  surface: {
    primary: 'rgb(0, 0, 0)',
    secondary: 'rgb(18, 18, 18)',
    tertiary: 'rgb(30, 30, 30)',

    reading: {
      background: 'rgb(0, 0, 0)',
      strip: 'rgb(26, 26, 26)',
    },

    dim: 'rgb(0, 0, 0)',
  },

  button: {
    primary: 'rgb(120, 200, 255)',
    secondary: 'rgb(30, 30, 30)',
    destructive: 'rgb(192, 57, 43)',
    confirmation: 'rgb(74, 190, 110)',
    selected: 'rgb(120, 200, 255)',
    disabled: 'rgb(95, 95, 95)',

    switch: {
      thumb: { on: 'rgb(120, 200, 255)', off: 'rgb(160, 160, 160)' },
      track: { on: 'rgb(20, 60, 86)', off: 'rgb(30, 30, 30)' },
    },
  },

  badge: {
    special: 'rgb(130, 120, 200)',
    error: 'rgb(197, 48, 48)',
  },

  banner: {
    alert: 'rgb(228, 88, 88)',
    warn: 'rgb(232, 186, 82)',
    good: 'rgb(74, 190, 110)',
  },

  border: {
    primary: 'rgb(30, 30, 30)',
    secondary: 'rgb(235, 235, 235)',
    accent: 'rgb(120, 200, 255)',
    disabled: 'rgb(95, 95, 95)',

    input: {
      primary: 'rgb(30, 30, 30)',
      error: 'rgb(240, 120, 120)',
    },

    checkbox: {
      on: 'rgb(120, 200, 255)',
      off: 'rgb(95, 95, 95)',
    },
  },

  progress: {
    primary: 'rgb(120, 200, 255)',
    secondary: 'rgb(235, 235, 235)',

    reading: {
      primary: 'rgb(246, 173, 85)',
      secondary: 'rgb(160, 160, 160)',
    },
  },
};
