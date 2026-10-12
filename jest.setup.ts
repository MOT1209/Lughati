// Icon glyph fonts load asynchronously and trigger act() warnings; tests don't need real glyphs.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { createElement } = require('react');
  const { Text } = require('react-native');
  // Render the icon name as a testID and keep the style, so tests can assert on mirroring.
  return {
    __esModule: true,
    default: ({ name, style }: { name: string; style?: unknown }) => createElement(Text, { testID: `icon-${name}`, style }),
  };
});

// AsyncStorage has no native module under Jest; use the package's official in-memory mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
