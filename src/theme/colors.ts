export interface ColorPalette {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
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
}

// Every text/background pair below is verified >= 4.5:1 (WCAG AA) by theme.test.ts.
const light: ColorPalette = {
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceMuted: '#EAEEF2',
  border: '#C9D0D8',
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
};

const dark: ColorPalette = {
  background: '#0E1216',
  surface: '#171C22',
  surfaceMuted: '#212831',
  border: '#3A4552',
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
};

export const palettes = { light, dark } as const;
export type ColorSchemeName = keyof typeof palettes;
