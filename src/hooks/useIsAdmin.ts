import { useEffect, useState } from 'react';

import { getAdminApi } from '@/services/admin';
import { useAuthStore } from '@/store/authStore';

// One answer per signed-in account for the app's lifetime. The server decides: whoami succeeds
// only for a token whose app_metadata.role is 'admin', so this only controls whether the entry
// point is shown, never what an account is allowed to do.
const known = new Map<string, boolean>();

export function useIsAdmin(): boolean {
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!userId || known.has(userId)) return;
    const api = getAdminApi();
    if (!api) return;
    let cancelled = false;
    api.whoami().then(
      (admin) => {
        known.set(userId, admin);
        if (!cancelled) setVersion((v) => v + 1);
      },
      (error: { code?: string }) => {
        // A definite "no" is remembered; a network failure is retried the next time the hook mounts.
        if (error?.code === 'forbidden') known.set(userId, false);
        if (!cancelled) setVersion((v) => v + 1);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return userId !== null && known.get(userId) === true;
}
