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

jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock.js'));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

// expo-speech talks to the device's text-to-speech engine; tests only need the calls. The voice
// list never settles by default ("unknown": listen buttons are shown and no late update causes
// act() noise); tests of voice support resolve it themselves.
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
  getAvailableVoicesAsync: jest.fn(() => new Promise(() => {})),
}));

// expo-router 58's renderRouter switches Jest to fake timers. Under RNTL 14's async act() a
// screen handler that awaits a timer (e.g. the mock auth latency) then never settles, so every
// press hangs. The app's integration tests run on real timers, as they did before SDK 58.
jest.mock('expo-router/testing-library', () => {
  const actual = jest.requireActual('expo-router/testing-library');
  const descriptors = Object.getOwnPropertyDescriptors(actual);
  delete descriptors.renderRouter;
  const wrapped = Object.defineProperties({}, descriptors);
  Object.defineProperty(wrapped, 'renderRouter', {
    enumerable: true,
    value: async (...args: Parameters<typeof actual.renderRouter>) => {
      const result = await actual.renderRouter(...args);
      jest.useFakeTimers({ advanceTimers: true });
      return result;
    },
  });
  return wrapped;
});
