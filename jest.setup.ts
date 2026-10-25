// Icon glyph fonts load asynchronously and trigger act() warnings; tests don't need real glyphs.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { createElement } = require('react');
  const { Text } = require('react-native');
  return { __esModule: true, default: (props: object) => createElement(Text, props) };
});

// AsyncStorage has no native module under Jest; use the package's official in-memory mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo-speech talks to the device's text-to-speech engine; tests only need the calls. The voice
// list never settles by default ("unknown": listen buttons are shown and no late update causes
// act() noise); tests of voice support resolve it themselves.
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
  getAvailableVoicesAsync: jest.fn(() => new Promise(() => {})),
}));
