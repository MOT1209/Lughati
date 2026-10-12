import type { LanguageCode, Vocabulary } from '@/types';

type TargetCode = Exclude<LanguageCode, 'ar'>;

// Meanings in the learner's source language (Arabic), one list per lesson, six items each.
// Every target language below lists its terms in exactly the same order, so index i of a lesson
// in any language means the same thing as index i here. vocabulary.test checks the shape.
const arabic: string[][] = [
  ['مرحباً', 'مع السلامة', 'شكراً', 'من فضلك', 'أهلاً بك', 'آسف'],
  ['اسمي…', 'ما اسمك؟', 'تشرفت بمعرفتك', 'كيف حالك؟', 'أنا بخير', 'من أين أنت؟'],
  ['واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'عشرة'],
  ['أحمر', 'أزرق', 'أخضر', 'أصفر', 'أسود', 'أبيض'],
  ['أم', 'أب', 'أخ', 'أخت', 'صديق', 'عائلة'],
  ['خبز', 'تفاح', 'بيضة', 'أرز', 'سمك', 'لحم'],
  ['ماء', 'قهوة', 'شاي', 'حليب', 'الحساب', 'القائمة'],
  ['اليوم', 'غداً', 'أمس', 'الآن', 'الصباح', 'الليل'],
  ['بيت', 'مدرسة', 'متجر', 'شارع', 'مدينة', 'مستشفى'],
  ['يسار', 'يمين', 'مباشرة', 'قريب', 'بعيد', 'تذكرة'],
];

const terms: Record<TargetCode, string[][]> = {
  de: [
    ['Hallo', 'Tschüss', 'Danke', 'Bitte', 'Willkommen', 'Entschuldigung'],
    ['Ich heiße…', 'Wie heißt du?', 'Freut mich', "Wie geht's?", 'Mir geht es gut', 'Woher kommst du?'],
    ['eins', 'zwei', 'drei', 'vier', 'fünf', 'zehn'],
    ['rot', 'blau', 'grün', 'gelb', 'schwarz', 'weiß'],
    ['die Mutter', 'der Vater', 'der Bruder', 'die Schwester', 'der Freund', 'die Familie'],
    ['das Brot', 'der Apfel', 'das Ei', 'der Reis', 'der Fisch', 'das Fleisch'],
    ['das Wasser', 'der Kaffee', 'der Tee', 'die Milch', 'die Rechnung', 'die Speisekarte'],
    ['heute', 'morgen', 'gestern', 'jetzt', 'der Morgen', 'die Nacht'],
    ['das Haus', 'die Schule', 'das Geschäft', 'die Straße', 'die Stadt', 'das Krankenhaus'],
    ['links', 'rechts', 'geradeaus', 'nah', 'weit', 'die Fahrkarte'],
  ],
  en: [
    ['Hello', 'Goodbye', 'Thank you', 'Please', 'Welcome', 'Sorry'],
    ['My name is…', 'What is your name?', 'Nice to meet you', 'How are you?', 'I am fine', 'Where are you from?'],
    ['one', 'two', 'three', 'four', 'five', 'ten'],
    ['red', 'blue', 'green', 'yellow', 'black', 'white'],
    ['mother', 'father', 'brother', 'sister', 'friend', 'family'],
    ['bread', 'apple', 'egg', 'rice', 'fish', 'meat'],
    ['water', 'coffee', 'tea', 'milk', 'the bill', 'the menu'],
    ['today', 'tomorrow', 'yesterday', 'now', 'morning', 'night'],
    ['house', 'school', 'shop', 'street', 'city', 'hospital'],
    ['left', 'right', 'straight ahead', 'near', 'far', 'ticket'],
  ],
  es: [
    ['Hola', 'Adiós', 'Gracias', 'Por favor', 'Bienvenido', 'Lo siento'],
    ['Me llamo…', '¿Cómo te llamas?', 'Mucho gusto', '¿Cómo estás?', 'Estoy bien', '¿De dónde eres?'],
    ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'diez'],
    ['rojo', 'azul', 'verde', 'amarillo', 'negro', 'blanco'],
    ['la madre', 'el padre', 'el hermano', 'la hermana', 'el amigo', 'la familia'],
    ['el pan', 'la manzana', 'el huevo', 'el arroz', 'el pescado', 'la carne'],
    ['el agua', 'el café', 'el té', 'la leche', 'la cuenta', 'el menú'],
    ['hoy', 'mañana', 'ayer', 'ahora', 'la mañana', 'la noche'],
    ['la casa', 'la escuela', 'la tienda', 'la calle', 'la ciudad', 'el hospital'],
    ['izquierda', 'derecha', 'todo recto', 'cerca', 'lejos', 'el billete'],
  ],
  fr: [
    ['Bonjour', 'Au revoir', 'Merci', "S'il vous plaît", 'Bienvenue', 'Désolé'],
    ["Je m'appelle…", "Comment tu t'appelles ?", 'Enchanté', 'Comment ça va ?', 'Ça va bien', "D'où viens-tu ?"],
    ['un', 'deux', 'trois', 'quatre', 'cinq', 'dix'],
    ['rouge', 'bleu', 'vert', 'jaune', 'noir', 'blanc'],
    ['la mère', 'le père', 'le frère', 'la sœur', "l'ami", 'la famille'],
    ['le pain', 'la pomme', "l'œuf", 'le riz', 'le poisson', 'la viande'],
    ["l'eau", 'le café', 'le thé', 'le lait', "l'addition", 'le menu'],
    ["aujourd'hui", 'demain', 'hier', 'maintenant', 'le matin', 'la nuit'],
    ['la maison', "l'école", 'le magasin', 'la rue', 'la ville', "l'hôpital"],
    ['à gauche', 'à droite', 'tout droit', 'près', 'loin', 'le billet'],
  ],
  tr: [
    ['Merhaba', 'Güle güle', 'Teşekkürler', 'Lütfen', 'Hoş geldiniz', 'Özür dilerim'],
    ['Benim adım…', 'Adın ne?', 'Memnun oldum', 'Nasılsın?', 'İyiyim', 'Nerelisin?'],
    ['bir', 'iki', 'üç', 'dört', 'beş', 'on'],
    ['kırmızı', 'mavi', 'yeşil', 'sarı', 'siyah', 'beyaz'],
    ['anne', 'baba', 'erkek kardeş', 'kız kardeş', 'arkadaş', 'aile'],
    ['ekmek', 'elma', 'yumurta', 'pirinç', 'balık', 'et'],
    ['su', 'kahve', 'çay', 'süt', 'hesap', 'menü'],
    ['bugün', 'yarın', 'dün', 'şimdi', 'sabah', 'gece'],
    ['ev', 'okul', 'dükkân', 'sokak', 'şehir', 'hastane'],
    ['sol', 'sağ', 'düz', 'yakın', 'uzak', 'bilet'],
  ],
};

const build = (code: LanguageCode, termLists: string[][], meaningKey: LanguageCode, meanings: string[][]): Vocabulary[] =>
  termLists.flatMap((lessonTerms, lessonIndex) =>
    lessonTerms.map((term, wordIndex) => ({
      id: `${code}-a1-${lessonIndex + 1}-w${wordIndex + 1}`,
      lessonId: `${code}-a1-${lessonIndex + 1}`,
      targetLanguage: code,
      term,
      translations: { [meaningKey]: meanings[lessonIndex]![wordIndex]! },
    })),
  );

export const vocabulary: Vocabulary[] = [
  // Learners of Arabic read the same course with English meanings (the English list above).
  ...build('ar', arabic, 'en', terms.en),
  ...(Object.keys(terms) as TargetCode[]).flatMap((code) => build(code, terms[code], 'ar', arabic)),
];

/** Exposed so tests can check every language lists the same shape as the Arabic list. */
export const arabicMeanings = arabic;
