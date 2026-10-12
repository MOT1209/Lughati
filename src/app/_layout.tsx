import { Slot } from 'expo-router';

// Side-effect import: initialises i18next before the first render so screens never see raw keys.
import '@/i18n';

// Placeholder root layout. The real navigators (auth group, tabs, stacks) replace <Slot /> when
// the Phase 1 screens are built.
export default function RootLayout() {
  return <Slot />;
}
