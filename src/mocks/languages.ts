import type { Language } from '@/types';

// Data-driven: adding a language means adding an entry here, not touching any screen.
// Every language is both a source (the learner's own language) and a target (to learn).
export const languages: Language[] = [
  {
    code: 'ar',
    name: { ar: 'العربية', en: 'Arabic' },
    nativeName: 'العربية',
    direction: 'rtl',
    flag: '🇸🇦',
    roles: ['source', 'target'],
  },
  {
    code: 'de',
    name: { ar: 'الألمانية', en: 'German' },
    nativeName: 'Deutsch',
    direction: 'ltr',
    flag: '🇩🇪',
    roles: ['source', 'target'],
  },
  {
    code: 'en',
    name: { ar: 'الإنجليزية', en: 'English' },
    nativeName: 'English',
    direction: 'ltr',
    flag: '🇺🇸',
    roles: ['source', 'target'],
  },
  {
    code: 'es',
    name: { ar: 'الإسبانية', en: 'Spanish' },
    nativeName: 'Español',
    direction: 'ltr',
    flag: '🇪🇸',
    roles: ['source', 'target'],
  },
  {
    code: 'fr',
    name: { ar: 'الفرنسية', en: 'French' },
    nativeName: 'Français',
    direction: 'ltr',
    flag: '🇫🇷',
    roles: ['source', 'target'],
  },
  {
    code: 'tr',
    name: { ar: 'التركية', en: 'Turkish' },
    nativeName: 'Türkçe',
    direction: 'ltr',
    flag: '🇹🇷',
    roles: ['source', 'target'],
  },
];
