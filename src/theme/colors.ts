export interface ColorPalette {
  background: string;
  surface: string;
  surfaceMuted: string;
  /** Decorative dividers and card outlines (not required to reach 3:1). */
  border: string;
  /** Outline of interactive controls (inputs, secondary buttons): >= 3:1 on surfaces (WCAG 1.4.11). */
  borderStrong: string;
  text: string;
  textSecondary: string;
  primary: string;
  onPrimary: string;
  primaryMuted: string;
  onPrimaryMuted: string;
  accent: string;
  success: string;
  error: string;
  errorMuted: string;
  onErrorMuted: string;
  overlay: string;
  /** Brand hero gradient (Home header): always the dark teal of the app icon, in both schemes. */
  heroStart: string;
  heroMid: string;
  heroEnd: string;
  onHero: string;
  onHeroMuted: string;
  /** Gold accent text/strokes on the hero (streak, daily-goal ring). */
  heroGold: string;
  /** Light chip on the hero (e.g. "Change"). */
  heroChip: string;
  onHeroChip: string;
  /** Gold call-to-action fill. */
  gold: string;
  onGold: string;
}

// Every text/background pair below is verified >= 4.5:1 (WCAG AA) by theme.test.ts.
const light: ColorPalette = {
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceMuted: '#EAEEF2',
  border: '#C9D0D8',
  borderStrong: '#737D89',
  text: '#12171E',
  textSecondary: '#4B5563',
  primary: '#0F766E',
  onPrimary: '#FFFFFF',
  primaryMuted: '#D6F0EC',
  onPrimaryMuted: '#0A4A45',
  accent: '#B45309',
  success: '#15803D',
  error: '#B42318',
  errorMuted: '#FDE8E6',
  onErrorMuted: '#7A1710',
  overlay: 'rgba(18, 23, 30, 0.5)',
  heroStart: '#0E6A62',
  heroMid: '#0A4E49',
  heroEnd: '#04201E',
  onHero: '#FFFFFF',
  onHeroMuted: '#BFE9E1',
  heroGold: '#FFD978',
  heroChip: '#C9F3EA',
  onHeroChip: '#04201E',
  gold: '#F2B33D',
  onGold: '#2A1A00',
};

const dark: ColorPalette = {
  background: '#0E1216',
  surface: '#171C22',
  surfaceMuted: '#212831',
  border: '#3A4552',
  borderStrong: '#7C8896',
  text: '#F1F4F8',
  textSecondary: '#B6BFCB',
  primary: '#4FD1C0',
  onPrimary: '#04201C',
  primaryMuted: '#143C38',
  onPrimaryMuted: '#9BECE0',
  accent: '#F6B25E',
  success: '#7EE2A0',
  error: '#FFB4A9',
  errorMuted: '#4A1D18',
  onErrorMuted: '#FFD9D4',
  overlay: 'rgba(0, 0, 0, 0.6)',
  heroStart: '#0E6A62',
  heroMid: '#0A4E49',
  heroEnd: '#04201E',
  onHero: '#FFFFFF',
  onHeroMuted: '#BFE9E1',
  heroGold: '#FFD978',
  heroChip: '#C9F3EA',
  onHeroChip: '#04201E',
  gold: '#FFC857',
  onGold: '#2A1A00',
};

export const palettes = { light, dark } as const;
export type ColorSchemeName = keyof typeof palettes;
