import type { LanguageCode, Vocabulary } from '@/types';

// [term, Arabic meaning] per lesson. The three lessons mirror mocks/lessons.ts by order.
type Pair = [term: string, ar: string];
type Curriculum = Record<Exclude<LanguageCode, 'ar'>, [Pair[], Pair[], Pair[]]>;

const curriculum: Curriculum = {
  de: [
    [['Hallo', 'مرحباً'], ['Tschüss', 'مع السلامة'], ['Danke', 'شكراً'], ['Bitte', 'من فضلك'], ['Willkommen', 'أهلاً بك']],
    [['eins', 'واحد'], ['zwei', 'اثنان'], ['drei', 'ثلاثة'], ['zehn', 'عشرة'], ['zwanzig', 'عشرون']],
    [['Wasser', 'ماء'], ['Kaffee', 'قهوة'], ['Tee', 'شاي'], ['Milch', 'حليب'], ['die Rechnung', 'الحساب']],
  ],
  en: [
    [['Hello', 'مرحباً'], ['Goodbye', 'مع السلامة'], ['Thank you', 'شكراً'], ['Please', 'من فضلك'], ['Welcome', 'أهلاً بك']],
    [['one', 'واحد'], ['two', 'اثنان'], ['three', 'ثلاثة'], ['ten', 'عشرة'], ['twenty', 'عشرون']],
    [['Water', 'ماء'], ['Coffee', 'قهوة'], ['Tea', 'شاي'], ['Milk', 'حليب'], ['The bill', 'الحساب']],
  ],
  es: [
    [['Hola', 'مرحباً'], ['Adiós', 'مع السلامة'], ['Gracias', 'شكراً'], ['Por favor', 'من فضلك'], ['Bienvenido', 'أهلاً بك']],
    [['uno', 'واحد'], ['dos', 'اثنان'], ['tres', 'ثلاثة'], ['diez', 'عشرة'], ['veinte', 'عشرون']],
    [['Agua', 'ماء'], ['Café', 'قهوة'], ['Té', 'شاي'], ['Leche', 'حليب'], ['La cuenta', 'الحساب']],
  ],
  fr: [
    [['Bonjour', 'مرحباً'], ['Au revoir', 'مع السلامة'], ['Merci', 'شكراً'], ["S'il vous plaît", 'من فضلك'], ['Bienvenue', 'أهلاً بك']],
    [['un', 'واحد'], ['deux', 'اثنان'], ['trois', 'ثلاثة'], ['dix', 'عشرة'], ['vingt', 'عشرون']],
    [['Eau', 'ماء'], ['Café', 'قهوة'], ['Thé', 'شاي'], ['Lait', 'حليب'], ["L'addition", 'الحساب']],
  ],
  tr: [
    [['Merhaba', 'مرحباً'], ['Güle güle', 'مع السلامة'], ['Teşekkürler', 'شكراً'], ['Lütfen', 'من فضلك'], ['Hoş geldiniz', 'أهلاً بك']],
    [['bir', 'واحد'], ['iki', 'اثنان'], ['üç', 'ثلاثة'], ['on', 'عشرة'], ['yirmi', 'عشرون']],
    [['Su', 'ماء'], ['Kahve', 'قهوة'], ['Çay', 'شاي'], ['Süt', 'حليب'], ['Hesap', 'الحساب']],
  ],
};

export const vocabulary: Vocabulary[] = (Object.keys(curriculum) as (keyof Curriculum)[]).flatMap((code) =>
  curriculum[code].flatMap((pairs, lessonIndex) =>
    pairs.map(([term, ar], wordIndex) => ({
      id: `${code}-a1-${lessonIndex + 1}-w${wordIndex + 1}`,
      lessonId: `${code}-a1-${lessonIndex + 1}`,
      targetLanguage: code,
      term,
      translations: { ar },
    })),
  ),
);
