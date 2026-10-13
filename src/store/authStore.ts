import { create } from 'zustand';

import { getAuthService, type Session, type SignInRequest, type SignUpRequest } from '@/services/auth';

import { useLearningStore } from './learningStore';

interface AuthState {
  session: Session | null;
  /** False until the first getSession() resolves; route decisions wait for it. */
  initialized: boolean;
  init: () => Promise<void>;
  signIn: (request: SignInRequest) => Promise<void>;
  signUp: (request: SignUpRequest) => Promise<void>;
  signOut: () => Promise<void>;
}

let unsubscribe: (() => void) | null = null;

/** Keeps the learner's language choice in step with who is signed in. */
function syncLearning(session: Session | null) {
  const learning = useLearningStore.getState();
  if (!session) learning.reset();
  else if (learning.userId !== session.user.id) void learning.loadProfile(session.user.id);
}

// Session state is driven only by the service's onAuthStateChange, so a different
// AuthService implementation behaves identically from the app's point of view.
export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  initialized: false,
  init: async () => {
    const service = getAuthService();
    unsubscribe?.();
    unsubscribe = service.onAuthStateChange((session) => {
      syncLearning(session);
      set({ session });
    });
    // A failing session read must not keep the app on the splash forever: start signed out.
    const session = await service.getSession().catch(() => null);
    syncLearning(session);
    set({ session, initialized: true });
  },
  signIn: async (request) => {
    await getAuthService().signIn(request);
  },
  signUp: async (request) => {
    await getAuthService().signUp(request);
  },
  signOut: async () => {
    await getAuthService().signOut();
  },
}));
