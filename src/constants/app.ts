// The product name lives in exactly three places: app.json ("name"), this constant, and the
// `app.name` key in each locale file. Screens must render t('app.name'), never a literal.
export const APP_NAME = 'Lughati';

export const STORAGE_KEYS = {
  preferences: 'lughati.preferences.v1',
  session: 'lughati.session.v1',
  learningProgress: 'lughati.learning-progress.v1',
  learningProfile: 'lughati.learning-profile.v1',
  vocabReviews: 'lughati.vocab-reviews.v1',
  dailyReminder: 'lughati.daily-reminder.v1',
} as const;

export const MIN_TOUCH_TARGET = 48;
export const PASSWORD_MIN_LENGTH = 8;
