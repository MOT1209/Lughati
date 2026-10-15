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

/**
 * Group-level protection depends only on whether a session exists, never on how it was
 * created. It does NOT imply the learner finished the language setup: the (app) group
 * contains setup-languages itself, so entry to the group is gated here and which screens
 * inside it are usable is decided by getInAppAccess below.
 */
export function getRouteAccess(hasSession: boolean) {
  return { canSeeAuth: !hasSession, canSeeApp: hasSession };
}

export interface InAppState {
  /** False until the signed-in account's language profile has been read from storage. */
  profileLoaded: boolean;
  /** True only when a complete (own + target) language profile exists for the account. */
  hasLanguageProfile: boolean;
}

export interface InAppAccess {
  /** Tabs, lessons and settings: only with a fully completed language profile. */
  canSeeLearning: boolean;
  /** Editing an existing language choice (language-selection, setup as edit). */
  canEditLanguages: boolean;
}

/**
 * Which in-((app)) screens a signed-in learner may see. A signed-in account whose profile
 * has not been read yet (or whose profile read failed, which loadProfile reports as "not
 * chosen yet") sees neither the learning screens nor a wrong fallback: the (app) layout
 * renders nothing while profileLoaded is false, so a deep link cannot flash or land on an
 * invalid route. Once loaded without a profile, only setup-languages is reachable.
 */
export function getInAppAccess(state: InAppState): InAppAccess {
  const learning = state.profileLoaded && state.hasLanguageProfile;
  return {
    canSeeLearning: learning,
    canEditLanguages: state.profileLoaded,
  };
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
