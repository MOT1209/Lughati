import { palettes, type ColorPalette } from './colors';
import { resolveScheme } from './resolveScheme';

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground, background] pairs the UI actually renders text on.
const textPairs: [keyof ColorPalette, keyof ColorPalette][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'surfaceMuted'],
  ['textSecondary', 'background'],
  ['textSecondary', 'surface'],
  ['textSecondary', 'surfaceMuted'],
  ['onPrimary', 'primary'],
  ['primary', 'surface'],
  ['primary', 'background'],
  ['onPrimaryMuted', 'primaryMuted'],
  ['error', 'surface'],
  ['error', 'background'],
  ['onErrorMuted', 'errorMuted'],
  ['accent', 'surface'],
  ['success', 'surface'],
];

describe.each(['light', 'dark'] as const)('%s palette', (scheme) => {
  const palette = palettes[scheme];

  it.each(textPairs)('%s on %s meets WCAG AA (4.5:1)', (fg, bg) => {
    expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

// Non-text contrast (WCAG 1.4.11): the outline of an interactive control must reach 3:1
// against every surface it can sit on.
describe.each(['light', 'dark'] as const)('%s borderStrong', (scheme) => {
  const palette = palettes[scheme];

  it.each(['background', 'surface'] as const)('reaches 3:1 on %s', (bg) => {
    expect(contrast(palette.borderStrong, palette[bg])).toBeGreaterThanOrEqual(3);
  });

  it('is visibly stronger than the decorative border', () => {
    expect(contrast(palette.borderStrong, palette.surface)).toBeGreaterThan(contrast(palette.border, palette.surface));
  });
});

it('light and dark palettes define exactly the same tokens', () => {
  expect(Object.keys(palettes.dark).sort()).toEqual(Object.keys(palettes.light).sort());
});

describe('resolveScheme', () => {
  it('follows the system when preference is "system"', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
  });

  it('falls back to light when the system reports nothing usable', () => {
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('system', 'unspecified')).toBe('light');
  });

  it('lets a manual choice override the system', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });
});
