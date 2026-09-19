// A string shaped like a colour: #RGB / #RRGGBB / #RRGGBBAA / #AARRGGBB, or an rgb()/hsl()
// function call. Matched on the literal's raw text, so it catches both quote styles.
const COLOUR_LITERAL =
  ':matches(Literal[raw=/^[\'"]#[0-9a-fA-F]{3,8}[\'"]$/], Literal[raw=/^[\'"](rgba?|hsla?)\\(/])';

const COLOUR_MESSAGE =
  'No colour literals. Every colour comes from the active theme — import { colors } from ' +
  "'shared/theme' and use a token (colors.text.primary, colors.surface.secondary, …). " +
  'For a translucent one, apply the level at the call site: alpha(colors.surface.dim, 0.5). ' +
  'See docs/contributing/theme/README.md.';

// fontSize / fontWeight written as a literal instead of a type token.
const TYPE_LITERAL =
  "Property[key.name=/^(fontSize|fontWeight)$/] > Literal[raw=/^['\"]?[0-9.]+['\"]?$/]";

const TYPE_MESSAGE =
  'No font-size or font-weight literals. Use a type token — import { text } from ' +
  "'shared/theme' and pick a step (text.size[3], text.size.title['x-large']) or a weight " +
  '(text.weight.bold). See docs/contributing/theme/README.md.';

// padding / margin / gap / borderRadius / borderWidth written as a literal. Zero is allowed: it
// means "none", not a step. Fixed width/height stay out — those are a component's own measurement,
// not a scale, and flagging them would make the rule cry wolf.
const SIZE_LITERAL =
  "Property[key.name=/^(padding|paddingTop|paddingBottom|paddingLeft|paddingRight|paddingHorizontal|paddingVertical|margin|marginTop|marginBottom|marginLeft|marginRight|marginHorizontal|marginVertical|gap|rowGap|columnGap|borderRadius|borderWidth|borderTopWidth|borderBottomWidth|borderLeftWidth|borderRightWidth|lineHeight)$/] > Literal[value!=0][raw=/^[0-9.]+$/]";

const SIZE_MESSAGE =
  'No spacing, radius, border-width or line-height literals. Use a token — import { spacing, ' +
  "radius, border, line } from 'shared/theme', or take them from createStyles: spacing[4], " +
  'radius.medium, border.small, line.height[4]. See docs/contributing/theme/README.md.';

module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    'react-native/no-inline-styles': 'off',
    // eslint-plugin-react crashes with minimatch v9 when evaluating render props;
    // disable until the plugin is updated to support minimatch v9.
    'react/no-unstable-nested-components': 'off',
    // Keeps the palette the single source of colour. Without this, a stray literal is merely
    // untidy today and a real bug once themes switch at runtime: it would not repaint.
    'no-restricted-syntax': [
      'error',
      { selector: COLOUR_LITERAL, message: COLOUR_MESSAGE },
      { selector: TYPE_LITERAL, message: TYPE_MESSAGE },
      { selector: SIZE_LITERAL, message: SIZE_MESSAGE },
    ],
  },
  overrides: [
    {
      // Where colours are supposed to live.
      files: ['src/shared/theme/**'],
      rules: { 'no-restricted-syntax': 'off' },
    },
    {
      // A colour in a test is an assertion value, not a UI colour — follow-star.tests.tsx passes
      // '#123456' to prove the `activeColor` prop is honoured, and a token would defeat the test
      // by matching the default. Exempting the files beats an inline disable on each one.
      files: ['**/*.tests.ts', '**/*.tests.tsx', '**/__tests__/**'],
      rules: { 'no-restricted-syntax': 'off' },
    },
  ],
};
