import type { ThemeColors } from '../../colors.types';

// Aço — Cold neutral grey with a faint blue accent — carries no colour of its own, so a cover is
// the only coloured thing on screen.
//
// Every foreground clears 7:1 against the surface it sits on (WCAG AAA for body text); the
// themes test is what holds that.
export const steelColors: ThemeColors = {
  text: {
    primary: 'rgb(230, 235, 242)',
    secondary: 'rgb(170, 178, 190)',
    tertiary: 'rgb(104, 112, 124)',
    ghost: 'rgb(230, 235, 242)',
    emphasis: 'rgb(230, 235, 242)',
    bold: 'rgb(230, 235, 242)',

    title: {
      primary: 'rgb(230, 235, 242)',
      secondary: 'rgb(170, 178, 190)',
    },

    button: {
      primary: 'rgb(14, 20, 30)',
      secondary: 'rgb(230, 235, 242)',
      destructive: 'rgb(230, 235, 242)',
    },

    link: {
      primary: 'rgb(150, 180, 220)',
      secondary: 'rgb(230, 235, 242)',
      destructive: 'rgb(238, 130, 130)',
    },

    input: {
      primary: 'rgb(230, 235, 242)',
      masked: 'rgb(230, 235, 242)',
      placeholder: 'rgb(104, 112, 124)',
    },

    label: 'rgb(230, 235, 242)',

    message: {
      good: 'rgb(120, 195, 140)',
      bad: 'rgb(238, 130, 130)',
    },
  },

  icon: {
    primary: 'rgb(230, 235, 242)',
    secondary: 'rgb(170, 178, 190)',
    tertiary: 'rgb(104, 112, 124)',

    button: {
      primary: 'rgb(14, 20, 30)',
      secondary: 'rgb(150, 180, 220)',
    },

    following: 'rgb(242, 185, 115)',

    status: {
      good: 'rgb(120, 195, 140)',
      off: 'rgb(104, 112, 124)',
      bad: 'rgb(238, 130, 130)',
      unread: 'rgb(150, 180, 220)',
    },

    message: {
      good: 'rgb(120, 195, 140)',
      bad: 'rgb(238, 130, 130)',
    },
  },

  surface: {
    primary: 'rgb(20, 24, 30)',
    secondary: 'rgb(32, 38, 46)',
    tertiary: 'rgb(46, 54, 64)',

    reading: {
      background: 'rgb(0, 0, 0)',
      strip: 'rgb(26, 26, 26)',
    },

    dim: 'rgb(0, 0, 0)',
  },

  button: {
    primary: 'rgb(150, 180, 220)',
    secondary: 'rgb(46, 54, 64)',
    destructive: 'rgb(192, 57, 43)',
    confirmation: 'rgb(120, 195, 140)',
    selected: 'rgb(150, 180, 220)',
    disabled: 'rgb(104, 112, 124)',

    switch: {
      thumb: { on: 'rgb(150, 180, 220)', off: 'rgb(170, 178, 190)' },
      track: { on: 'rgb(52, 68, 92)', off: 'rgb(46, 54, 64)' },
    },
  },

  badge: {
    special: 'rgb(155, 150, 200)',
    error: 'rgb(197, 48, 48)',
  },

  banner: {
    alert: 'rgb(150, 180, 220)',
    notice: 'rgb(150, 180, 220)',
    good: 'rgb(120, 195, 140)',
  },

  border: {
    primary: 'rgb(46, 54, 64)',
    secondary: 'rgb(230, 235, 242)',
    accent: 'rgb(150, 180, 220)',
    disabled: 'rgb(104, 112, 124)',

    input: {
      primary: 'rgb(46, 54, 64)',
      error: 'rgb(238, 130, 130)',
    },

    checkbox: {
      on: 'rgb(150, 180, 220)',
      off: 'rgb(104, 112, 124)',
    },
  },

  progress: {
    primary: 'rgb(150, 180, 220)',
    secondary: 'rgb(230, 235, 242)',

    reading: {
      primary: 'rgb(242, 185, 115)',
      secondary: 'rgb(170, 178, 190)',
    },
  },
};
