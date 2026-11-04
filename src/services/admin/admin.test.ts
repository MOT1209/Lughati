import type { SupabaseClient } from '@supabase/supabase-js';

import { AdminError, createAdminApi } from '.';

const client = (result: unknown) =>
  ({
    functions: {
      invoke: jest.fn(async () => result),
    },
  }) as unknown as SupabaseClient;

describe('admin api', () => {
  it('sends the action to ai-gateway and unwraps the answer', async () => {
    const c = client({ data: { admin: true }, error: null });
    await expect(createAdminApi(c).whoami()).resolves.toBe(true);
    expect(c.functions.invoke).toHaveBeenCalledWith('ai-gateway', { body: { admin: 'whoami' } });
  });

  it('passes the arguments of each action through unchanged', async () => {
    const c = client({ data: { ok: true }, error: null });
    const api = createAdminApi(c);
    await api.setUserLimit('u1', null);
    await api.setUserBanned('u1', true);
    await api.upsertModel({ id: 'm', enabled: false });
    await api.setRoute({ task: 'quiz', primaryModel: 'm' });
    const bodies = (c.functions.invoke as jest.Mock).mock.calls.map((call) => (call[1] as { body: unknown }).body);
    expect(bodies).toEqual([
      { admin: 'users.setLimit', userId: 'u1', dailyRequests: null },
      { admin: 'users.setBanned', userId: 'u1', banned: true },
      { admin: 'models.upsert', model: { id: 'm', enabled: false } },
      { admin: 'routing.set', route: { task: 'quiz', primaryModel: 'm' } },
    ]);
  });

  it('is not an admin when the server says so (a 403 is "forbidden", never a crash)', async () => {
    const c = client({ data: null, error: { name: 'FunctionsHttpError', context: { status: 403 } } });
    await expect(createAdminApi(c).whoami()).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('keeps the server error token of a rejected change', async () => {
    const error = { name: 'FunctionsHttpError', context: { status: 400, json: async () => ({ error: 'cannot_enable_unverified' }) } };
    const c = client({ data: null, error });
    await expect(createAdminApi(c).upsertModel({ id: 'm', enabled: true })).rejects.toMatchObject({ code: 'rejected', detail: 'cannot_enable_unverified' });
  });

  it('maps a connection failure to network', async () => {
    const c = client({ data: null, error: { name: 'FunctionsFetchError' } });
    await expect(createAdminApi(c).overview()).rejects.toBeInstanceOf(AdminError);
    await expect(createAdminApi(c).overview()).rejects.toMatchObject({ code: 'network' });
  });
});
