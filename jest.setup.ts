// Icon glyph fonts load asynchronously and trigger act() warnings; tests don't need real glyphs.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { createElement } = require('react');
  const { Text } = require('react-native');
  return { __esModule: true, default: () => createElement(Text) };
});

// AsyncStorage has no native module under Jest; use the package's official in-memory mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
