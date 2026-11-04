import type { SupabaseClient } from '@supabase/supabase-js';

import { mapAuthError, SupabaseAuthService, toAppUser } from './SupabaseAuthService';
import { AuthError } from './types';

const user = (over: Record<string, unknown> = {}) => ({
  id: '11111111-1111-1111-1111-111111111111',
  email: 'Sara@Example.com',
  created_at: '2026-01-01T00:00:00Z',
  last_sign_in_at: '2026-02-01T00:00:00Z',
  user_metadata: { name: ' سارة ' },
  identities: [{}],
  ...over,
});

function fakeClient(auth: Record<string, unknown>, rpc = jest.fn()) {
  let listener: ((event: string, session: unknown) => void) | undefined;
  const client = {
    auth: {
      onAuthStateChange: jest.fn((cb) => {
        listener = cb;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      ...auth,
    },
    rpc,
  } as unknown as SupabaseClient;
  return { client, emit: (e: string, s: unknown) => listener?.(e, s), rpc };
}

describe('mapAuthError', () => {
  it.each([
    [{ code: 'invalid_credentials', status: 400 }, 'invalid_credentials'],
    [{ code: 'user_already_exists', status: 422 }, 'email_in_use'],
    [{ code: 'email_not_confirmed', status: 400 }, 'email_not_confirmed'],
    [{ code: 'weak_password', status: 422 }, 'weak_password'],
    [{ status: 429 }, 'rate_limited'],
    [{ name: 'AuthRetryableFetchError', status: 0 }, 'network'],
    [{ code: 'something_new' }, 'unknown'],
    [new Error('boom'), 'unknown'],
  ])('%j -> %s', (input, code) => {
    expect(mapAuthError(input).code).toBe(code);
  });

  it('never leaks the original message', () => {
    expect(mapAuthError({ message: 'secret-token-abc' }).message).toBe('unknown');
  });
});

describe('toAppUser', () => {
  it('trims the name, lowercases the e-mail and uses the account creation date', () => {
    const u = toAppUser(user() as never);
    expect(u).toMatchObject({ name: 'سارة', email: 'sara@example.com', joinedAt: '2026-01-01T00:00:00Z' });
  });
  it('falls back to the e-mail local part when there is no name', () => {
    expect(toAppUser(user({ user_metadata: {} }) as never).name).toBe('sara');
  });
});

describe('SupabaseAuthService', () => {
  it('signIn returns the session and trims the e-mail', async () => {
    const signInWithPassword = jest.fn().mockResolvedValue({ data: { session: { user: user() } }, error: null });
    const { client } = fakeClient({ signInWithPassword });
    const session = await new SupabaseAuthService(client).signIn({ method: 'password', email: ' sara@example.com ', password: 'pw123456' });
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'sara@example.com', password: 'pw123456' });
    expect(session.user.email).toBe('sara@example.com');
  });

  it('signIn maps a wrong password to invalid_credentials', async () => {
    const signInWithPassword = jest.fn().mockResolvedValue({ data: { session: null }, error: { code: 'invalid_credentials', status: 400 } });
    const { client } = fakeClient({ signInWithPassword });
    await expect(new SupabaseAuthService(client).signIn({ method: 'password', email: 'a@b.co', password: 'x' })).rejects.toMatchObject({ code: 'invalid_credentials' });
  });

  it('signIn maps a thrown network failure to network', async () => {
    const signInWithPassword = jest.fn().mockRejectedValue({ name: 'AuthRetryableFetchError', status: 0 });
    const { client } = fakeClient({ signInWithPassword });
    await expect(new SupabaseAuthService(client).signIn({ method: 'password', email: 'a@b.co', password: 'x' })).rejects.toMatchObject({ code: 'network' });
  });

  it('signUp sends the name as metadata and reports e-mail verification when there is no session', async () => {
    const signUp = jest.fn().mockResolvedValue({ data: { user: user(), session: null }, error: null });
    const { client } = fakeClient({ signUp });
    const outcome = await new SupabaseAuthService(client).signUp({ method: 'password', name: ' سارة ', email: 'sara@example.com', password: 'pw123456' });
    expect(signUp).toHaveBeenCalledWith({ email: 'sara@example.com', password: 'pw123456', options: { data: { name: 'سارة' } } });
    expect(outcome).toEqual({ session: null, needsEmailVerification: true });
  });

  it('signUp with an immediate session needs no verification', async () => {
    const signUp = jest.fn().mockResolvedValue({ data: { user: user(), session: { user: user() } }, error: null });
    const { client } = fakeClient({ signUp });
    const outcome = await new SupabaseAuthService(client).signUp({ method: 'password', name: 'S', email: 'sara@example.com', password: 'pw123456' });
    expect(outcome.needsEmailVerification).toBe(false);
    expect(outcome.session?.user.id).toBe(user().id);
  });

  it('signUp detects an already registered address (no identities)', async () => {
    const signUp = jest.fn().mockResolvedValue({ data: { user: user({ identities: [] }), session: null }, error: null });
    const { client } = fakeClient({ signUp });
    await expect(new SupabaseAuthService(client).signUp({ method: 'password', name: 'S', email: 'sara@example.com', password: 'pw123456' })).rejects.toMatchObject({ code: 'email_in_use' });
  });

  it('getSession returns null on a storage/refresh error (expired session = signed out)', async () => {
    const getSession = jest.fn().mockResolvedValue({ data: { session: null }, error: { message: 'bad' } });
    const { client } = fakeClient({ getSession });
    expect(await new SupabaseAuthService(client).getSession()).toBeNull();
  });

  it('restores a stored session', async () => {
    const getSession = jest.fn().mockResolvedValue({ data: { session: { user: user() } }, error: null });
    const { client } = fakeClient({ getSession });
    expect((await new SupabaseAuthService(client).getSession())?.user.name).toBe('سارة');
  });

  it('forwards sign-in/out events, skips INITIAL_SESSION and TOKEN_REFRESHED', async () => {
    const getSession = jest.fn().mockResolvedValue({ data: { session: null }, error: null });
    const { client, emit } = fakeClient({ getSession });
    const service = new SupabaseAuthService(client);
    const listener = jest.fn();
    service.onAuthStateChange(listener);
    emit('INITIAL_SESSION', null);
    emit('TOKEN_REFRESHED', { user: user() });
    expect(listener).not.toHaveBeenCalled();
    emit('SIGNED_IN', { user: user() });
    emit('SIGNED_OUT', null);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[0][0].user.id).toBe(user().id);
    expect(listener.mock.calls[1][0]).toBeNull();
  });

  it('signOut ends only this device and reports a failed local sign-out', async () => {
    const signOut = jest.fn().mockResolvedValue({ error: { message: 'x' } });
    const { client } = fakeClient({ signOut });
    await expect(new SupabaseAuthService(client).signOut()).rejects.toMatchObject({ code: 'sign_out_not_persisted' });
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('password reset and resend call the right API', async () => {
    const resetPasswordForEmail = jest.fn().mockResolvedValue({ error: null });
    const resend = jest.fn().mockResolvedValue({ error: null });
    const { client } = fakeClient({ resetPasswordForEmail, resend });
    const service = new SupabaseAuthService(client);
    await service.requestPasswordReset(' a@b.co ');
    await service.resendVerification('a@b.co');
    expect(resetPasswordForEmail).toHaveBeenCalledWith('a@b.co');
    expect(resend).toHaveBeenCalledWith({ type: 'signup', email: 'a@b.co' });
  });

  it('deleteAccount calls the RPC, signs out locally and notifies listeners', async () => {
    const getSession = jest.fn().mockResolvedValue({ data: { session: null }, error: null });
    const rpc = jest.fn().mockResolvedValue({ error: null });
    const { client } = fakeClient({ getSession }, rpc);
    const service = new SupabaseAuthService(client);
    const listener = jest.fn();
    service.onAuthStateChange(listener);
    await service.deleteAccount();
    expect(rpc).toHaveBeenCalledWith('delete_my_account');
    expect(listener).toHaveBeenCalledWith(null);
  });

  it('deleteAccount failure maps to delete_failed and keeps the session', async () => {
    const rpc = jest.fn().mockResolvedValue({ error: { code: '42501', message: 'denied' } });
    const { client } = fakeClient({}, rpc);
    const error = await new SupabaseAuthService(client).deleteAccount().catch((e) => e);
    expect(error).toBeInstanceOf(AuthError);
    expect(error.code).toBe('delete_failed');
  });
});
