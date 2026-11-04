import type { LanguageCode, Vocabulary } from '@/types';

type TargetCode = Exclude<LanguageCode, 'ar'>;

// The Arabic course lists, one list per lesson, six items each.
// Every target language below lists its terms in exactly the same order, so index i of a lesson
// in any language means the same thing as index i here. vocabulary.test checks the shape.
const arabicA1: string[][] = [
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

const termsA1: Record<TargetCode, string[][]> = {
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

// A2: same layout as A1 (lesson i of mocks/lessons.ts a2Templates, word j). Verbs are listed in
// their dictionary form (Arabic: present tense, third person). Where a language says "I am hungry"
// with a verb (fr avoir faim, es tener hambre), the word is that phrase, not a rarer adjective.
const arabicA2: string[][] = [
  ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'عطلة نهاية الأسبوع'],
  ['شمس', 'مطر', 'ثلج', 'رياح', 'حار', 'بارد'],
  ['رأس', 'يد', 'عين', 'طبيب', 'دواء', 'مريض'],
  ['قميص', 'حذاء', 'معطف', 'سعر', 'رخيص', 'غالٍ'],
  ['مطبخ', 'غرفة نوم', 'حمّام', 'باب', 'نافذة', 'سرير'],
  ['عمل', 'مكتب', 'معلّم', 'طالب', 'كتاب', 'اجتماع'],
  ['رياضة', 'موسيقى', 'قراءة', 'سباحة', 'فيلم', 'رسم'],
  ['مطار', 'فندق', 'جواز سفر', 'حقيبة سفر', 'قطار', 'رحلة'],
  ['يأكل', 'يشرب', 'ينام', 'يعمل', 'يقرأ', 'يكتب'],
  ['سعيد', 'حزين', 'متعب', 'جائع', 'كبير', 'صغير'],
];

const termsA2: Record<TargetCode, string[][]> = {
  de: [
    ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'das Wochenende'],
    ['die Sonne', 'der Regen', 'der Schnee', 'der Wind', 'heiß', 'kalt'],
    ['der Kopf', 'die Hand', 'das Auge', 'der Arzt', 'das Medikament', 'krank'],
    ['das Hemd', 'die Schuhe', 'der Mantel', 'der Preis', 'billig', 'teuer'],
    ['die Küche', 'das Schlafzimmer', 'das Badezimmer', 'die Tür', 'das Fenster', 'das Bett'],
    ['die Arbeit', 'das Büro', 'der Lehrer', 'der Student', 'das Buch', 'die Besprechung'],
    ['der Sport', 'die Musik', 'das Lesen', 'das Schwimmen', 'der Film', 'das Zeichnen'],
    ['der Flughafen', 'das Hotel', 'der Reisepass', 'der Koffer', 'der Zug', 'die Reise'],
    ['essen', 'trinken', 'schlafen', 'arbeiten', 'lesen', 'schreiben'],
    ['glücklich', 'traurig', 'müde', 'hungrig', 'groß', 'klein'],
  ],
  en: [
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'the weekend'],
    ['sun', 'rain', 'snow', 'wind', 'hot', 'cold'],
    ['head', 'hand', 'eye', 'doctor', 'medicine', 'sick'],
    ['shirt', 'shoes', 'coat', 'price', 'cheap', 'expensive'],
    ['kitchen', 'bedroom', 'bathroom', 'door', 'window', 'bed'],
    ['work', 'office', 'teacher', 'student', 'book', 'meeting'],
    ['sport', 'music', 'reading', 'swimming', 'film', 'drawing'],
    ['airport', 'hotel', 'passport', 'suitcase', 'train', 'trip'],
    ['to eat', 'to drink', 'to sleep', 'to work', 'to read', 'to write'],
    ['happy', 'sad', 'tired', 'hungry', 'big', 'small'],
  ],
  es: [
    ['el lunes', 'el martes', 'el miércoles', 'el jueves', 'el viernes', 'el fin de semana'],
    ['el sol', 'la lluvia', 'la nieve', 'el viento', 'caluroso', 'frío'],
    ['la cabeza', 'la mano', 'el ojo', 'el médico', 'el medicamento', 'enfermo'],
    ['la camisa', 'los zapatos', 'el abrigo', 'el precio', 'barato', 'caro'],
    ['la cocina', 'el dormitorio', 'el baño', 'la puerta', 'la ventana', 'la cama'],
    ['el trabajo', 'la oficina', 'el profesor', 'el estudiante', 'el libro', 'la reunión'],
    ['el deporte', 'la música', 'la lectura', 'la natación', 'la película', 'el dibujo'],
    ['el aeropuerto', 'el hotel', 'el pasaporte', 'la maleta', 'el tren', 'el viaje'],
    ['comer', 'beber', 'dormir', 'trabajar', 'leer', 'escribir'],
    ['feliz', 'triste', 'cansado', 'tener hambre', 'grande', 'pequeño'],
  ],
  fr: [
    ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'le week-end'],
    ['le soleil', 'la pluie', 'la neige', 'le vent', 'chaud', 'froid'],
    ['la tête', 'la main', "l'œil", 'le médecin', 'le médicament', 'malade'],
    ['la chemise', 'les chaussures', 'le manteau', 'le prix', 'bon marché', 'cher'],
    ['la cuisine', 'la chambre', 'la salle de bain', 'la porte', 'la fenêtre', 'le lit'],
    ['le travail', 'le bureau', 'le professeur', "l'étudiant", 'le livre', 'la réunion'],
    ['le sport', 'la musique', 'la lecture', 'la natation', 'le film', 'le dessin'],
    ["l'aéroport", "l'hôtel", 'le passeport', 'la valise', 'le train', 'le voyage'],
    ['manger', 'boire', 'dormir', 'travailler', 'lire', 'écrire'],
    ['heureux', 'triste', 'fatigué', 'avoir faim', 'grand', 'petit'],
  ],
  tr: [
    ['pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'hafta sonu'],
    ['güneş', 'yağmur', 'kar', 'rüzgâr', 'sıcak', 'soğuk'],
    ['baş', 'el', 'göz', 'doktor', 'ilaç', 'hasta'],
    ['gömlek', 'ayakkabı', 'palto', 'fiyat', 'ucuz', 'pahalı'],
    ['mutfak', 'yatak odası', 'banyo', 'kapı', 'pencere', 'yatak'],
    ['iş', 'ofis', 'öğretmen', 'öğrenci', 'kitap', 'toplantı'],
    ['spor', 'müzik', 'okuma', 'yüzme', 'film', 'resim'],
    ['havalimanı', 'otel', 'pasaport', 'bavul', 'tren', 'yolculuk'],
    ['yemek', 'içmek', 'uyumak', 'çalışmak', 'okumak', 'yazmak'],
    ['mutlu', 'üzgün', 'yorgun', 'aç', 'büyük', 'küçük'],
  ],
};

type CourseLevel = 'a1' | 'a2';

// Index i of a lesson means the same thing in every language, so each word gets its meaning in
// every other course language and the learner sees it in their own (source) language.
const courses: Record<CourseLevel, Record<LanguageCode, string[][]>> = {
  a1: { ar: arabicA1, ...termsA1 },
  a2: { ar: arabicA2, ...termsA2 },
};
const codes = Object.keys(courses.a1) as LanguageCode[];

const build = (code: LanguageCode, level: CourseLevel): Vocabulary[] => {
  const lists = courses[level];
  return lists[code].flatMap((lessonTerms, lessonIndex) =>
    lessonTerms.map((term, wordIndex) => ({
      id: `${code}-${level}-${lessonIndex + 1}-w${wordIndex + 1}`,
      lessonId: `${code}-${level}-${lessonIndex + 1}`,
      targetLanguage: code,
      term,
      translations: Object.fromEntries(
        codes.filter((other) => other !== code).map((other) => [other, lists[other][lessonIndex]![wordIndex]!]),
      ),
    })),
  );
};

export const vocabulary: Vocabulary[] = codes.flatMap((code) => [...build(code, 'a1'), ...build(code, 'a2')]);

/** Exposed so tests can check every language lists the same shape as the Arabic lists. */
export const arabicMeanings: Record<CourseLevel, string[][]> = { a1: arabicA1, a2: arabicA2 };
