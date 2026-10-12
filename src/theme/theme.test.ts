import { palettes, type ColorPalette } from './colors';
import { resolveScheme } from './resolveScheme';

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground, background] pairs that carry text. WCAG AA for normal text is 4.5:1.
const textPairs: [keyof ColorPalette, keyof ColorPalette][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'surfaceMuted'],
  ['textSecondary', 'background'],
  ['textSecondary', 'surface'],
  ['textSecondary', 'surfaceMuted'],
  ['onPrimary', 'primary'],
  ['onPrimaryMuted', 'primaryMuted'],
  ['primary', 'background'],
  ['primary', 'surface'],
  ['accent', 'background'],
  ['accent', 'surface'],
  ['success', 'background'],
  ['success', 'surface'],
  ['error', 'background'],
  ['error', 'surface'],
  ['onErrorMuted', 'errorMuted'],
];

describe('palette contrast (WCAG AA)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    it.each(textPairs)(`${scheme}: %s on %s is at least 4.5:1`, (fg, bg) => {
      const palette = palettes[scheme];
      expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe('resolveScheme', () => {
  it('lets an explicit preference win over the system scheme', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });

  it('follows the system scheme when the preference is "system"', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
  });

  it('treats an unknown or missing system scheme as light', () => {
    expect(resolveScheme('system', 'unspecified')).toBe('light');
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', undefined)).toBe('light');
  });
});
