import { getDirectionAction } from '@/services/direction';

import { getRouteAccess, resolveInitialRoute, ROUTES } from './routing';

describe('route guard', () => {
  it('without a session only the auth group is reachable', () => {
    expect(getRouteAccess(false)).toEqual({ canSeeAuth: true, canSeeApp: false });
  });

  it('with a session only the app group is reachable', () => {
    expect(getRouteAccess(true)).toEqual({ canSeeAuth: false, canSeeApp: true });
  });
});

describe('splash destination', () => {
  it('sends a signed-in user home, even if onboarding was never marked', () => {
    expect(resolveInitialRoute({ hasSession: true, onboardingSeen: false })).toBe(ROUTES.home);
  });

  it('sends a first-time visitor to onboarding', () => {
    expect(resolveInitialRoute({ hasSession: false, onboardingSeen: false })).toBe(ROUTES.onboarding);
  });

  it('sends a returning signed-out user to login', () => {
    expect(resolveInitialRoute({ hasSession: false, onboardingSeen: true })).toBe(ROUTES.login);
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
