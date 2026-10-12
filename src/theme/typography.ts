// Cairo ships separate files per weight; on Android `fontWeight` does not select them,
// so each variant names its family explicitly.
export const fontFamilies = {
  regular: 'Cairo_400Regular',
  semibold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
} as const;

export interface TextStyleSpec {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

// Arabic needs generous line height (tall ascenders/diacritics). Heights are line-based,
// never fixed on containers, so system font scaling grows text instead of clipping it.
export const typography = {
  display: { fontFamily: fontFamilies.bold, fontSize: 32, lineHeight: 50 },
  title: { fontFamily: fontFamilies.bold, fontSize: 24, lineHeight: 38 },
  heading: { fontFamily: fontFamilies.semibold, fontSize: 20, lineHeight: 32 },
  subheading: { fontFamily: fontFamilies.semibold, fontSize: 17, lineHeight: 28 },
  body: { fontFamily: fontFamilies.regular, fontSize: 16, lineHeight: 28 },
  bodyStrong: { fontFamily: fontFamilies.semibold, fontSize: 16, lineHeight: 28 },
  small: { fontFamily: fontFamilies.regular, fontSize: 14, lineHeight: 24 },
  caption: { fontFamily: fontFamilies.regular, fontSize: 12, lineHeight: 20 },
  button: { fontFamily: fontFamilies.semibold, fontSize: 16, lineHeight: 26 },
} as const satisfies Record<string, TextStyleSpec>;

export type TypographyVariant = keyof typeof typography;
