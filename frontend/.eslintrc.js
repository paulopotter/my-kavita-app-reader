module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    'react-native/no-inline-styles': 'off',
    // eslint-plugin-react crashes with minimatch v9 when evaluating render props;
    // disable until the plugin is updated to support minimatch v9.
    'react/no-unstable-nested-components': 'off',
  },
};
