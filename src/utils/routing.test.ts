import { getDirectionAction } from '@/services/direction';

import { getInAppAccess, getRouteAccess, resolveInitialRoute, ROUTES } from './routing';

describe('route guard', () => {
  it('without a session only the auth group is reachable', () => {
    expect(getRouteAccess(false)).toEqual({ canSeeAuth: true, canSeeApp: false });
  });

  it('with a session only the app group is reachable', () => {
    expect(getRouteAccess(true)).toEqual({ canSeeAuth: false, canSeeApp: true });
  });
});

describe('in-app access policy', () => {
  it('blocks every screen while the profile of the signed-in account has not been read yet', () => {
    expect(getInAppAccess({ profileLoaded: false, hasLanguageProfile: false })).toEqual({
      canSeeLearning: false,
      canEditLanguages: false,
    });
  });

  it('lets only the language setup through once the profile was loaded but none was chosen', () => {
    expect(getInAppAccess({ profileLoaded: true, hasLanguageProfile: false })).toEqual({
      canSeeLearning: false,
      canEditLanguages: true,
    });
  });

  it('unlocks learning screens for a complete profile', () => {
    expect(getInAppAccess({ profileLoaded: true, hasLanguageProfile: true })).toEqual({
      canSeeLearning: true,
      canEditLanguages: true,
    });
  });
});

describe('splash destination', () => {
  it('sends a signed-in user home once they chose their languages, even if onboarding was never marked', () => {
    expect(resolveInitialRoute({ hasSession: true, onboardingSeen: false, hasLanguageProfile: true })).toBe(ROUTES.home);
  });

  it('asks a signed-in user without a language choice to choose first', () => {
    expect(resolveInitialRoute({ hasSession: true, onboardingSeen: true, hasLanguageProfile: false })).toBe(ROUTES.setupLanguages);
  });

  it('sends a first-time visitor to onboarding', () => {
    expect(resolveInitialRoute({ hasSession: false, onboardingSeen: false, hasLanguageProfile: false })).toBe(ROUTES.onboarding);
  });

  it('sends a returning signed-out user to login', () => {
    expect(resolveInitialRoute({ hasSession: false, onboardingSeen: true, hasLanguageProfile: false })).toBe(ROUTES.login);
  });
});

describe('layout direction', () => {
  it('needs a restart only when native and desired direction differ', () => {
    expect(getDirectionAction(true, true)).toBe('none');
    expect(getDirectionAction(false, false)).toBe('none');
    expect(getDirectionAction(true, false)).toBe('restart-required');
    expect(getDirectionAction(false, true)).toBe('restart-required');
  });
});
