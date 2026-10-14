export const ROUTES = {
  splash: '/',
  onboarding: '/onboarding',
  login: '/login',
  register: '/register',
  home: '/home',
  languageSelection: '/language-selection',
  setupLanguages: '/setup-languages',
  settings: '/settings',
  learn: '/learn',
  lesson: (id: string) => `/lesson/${id}` as const,
  // Expo Router typed routes require an object with pathname + params.
  // Keep the string form for legacy usage, but prefer this helper for navigation.
  lessonRoute: (id: string) => ({ pathname: '/lesson/[id]' as const, params: { id } } as const),
} as const;

export type InitialRoute = typeof ROUTES.onboarding | typeof ROUTES.login | typeof ROUTES.setupLanguages | typeof ROUTES.home;

/** Route protection depends only on whether a session exists, never on how it was created. */
export function getRouteAccess(hasSession: boolean) {
  return { canSeeAuth: !hasSession, canSeeApp: hasSession };
}

/**
 * Splash decision: a signed-in learner goes home once they chose their own and target language
 * (otherwise to that choice); signed out, it depends on whether onboarding was completed.
 */
export function resolveInitialRoute(state: {
  hasSession: boolean;
  onboardingSeen: boolean;
  hasLanguageProfile: boolean;
}): InitialRoute {
  if (state.hasSession) return state.hasLanguageProfile ? ROUTES.home : ROUTES.setupLanguages;
  return state.onboardingSeen ? ROUTES.login : ROUTES.onboarding;
}
