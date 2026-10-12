import type { Language } from '@/types';

// Data-driven: adding a language means adding an entry here, not touching any screen.
// Arabic is source-only for now; adding 'target' to its roles is all it takes to teach it.
export const languages: Language[] = [
  {
    code: 'ar',
    name: { ar: 'العربية', en: 'Arabic' },
    nativeName: 'العربية',
    flag: '🇸🇦',
    direction: 'rtl',
    roles: ['source'],
  },
  {
    code: 'de',
    name: { ar: 'الألمانية', en: 'German' },
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    direction: 'ltr',
    roles: ['target'],
  },
  {
    code: 'en',
    name: { ar: 'الإنجليزية', en: 'English' },
    nativeName: 'English',
    flag: '🇬🇧',
    direction: 'ltr',
    roles: ['target'],
  },
  {
    code: 'es',
    name: { ar: 'الإسبانية', en: 'Spanish' },
    nativeName: 'Español',
    flag: '🇪🇸',
    direction: 'ltr',
    roles: ['target'],
  },
  {
    code: 'fr',
    name: { ar: 'الفرنسية', en: 'French' },
    nativeName: 'Français',
    flag: '🇫🇷',
    direction: 'ltr',
    roles: ['target'],
  },
  {
    code: 'tr',
    name: { ar: 'التركية', en: 'Turkish' },
    nativeName: 'Türkçe',
    flag: '🇹🇷',
    direction: 'ltr',
    roles: ['target'],
  },
];
