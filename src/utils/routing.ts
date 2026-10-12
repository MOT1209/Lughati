export const ROUTES = {
  splash: '/',
  onboarding: '/onboarding',
  login: '/login',
  register: '/register',
  home: '/home',
  languageSelection: '/language-selection',
  settings: '/settings',
} as const;

export type InitialRoute = typeof ROUTES.onboarding | typeof ROUTES.login | typeof ROUTES.home;

/** Route protection depends only on whether a session exists, never on how it was created. */
export function getRouteAccess(hasSession: boolean) {
  return { canSeeAuth: !hasSession, canSeeApp: hasSession };
}

/** Splash decision: session wins, then whether onboarding was already completed. */
export function resolveInitialRoute(state: {
  hasSession: boolean;
  onboardingSeen: boolean;
}): InitialRoute {
  if (state.hasSession) return ROUTES.home;
  return state.onboardingSeen ? ROUTES.login : ROUTES.onboarding;
}
