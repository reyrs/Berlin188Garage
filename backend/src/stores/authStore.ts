import { create } from 'zustand';
import type { User } from '@shared/types';
import { signInStaff, signOutStaff, getSession, onAuthStateChange } from '@shared/auth';
import { fetchProfiles } from '@shared/db';

interface AuthState {
  activeStaffUser: User | null;
  staffDirectory: User[];
  onlineStaffIds: Set<string>;
  isLoading: boolean;
  isRestoring: boolean;

  setOnlineStaffIds: (ids: Set<string>) => void;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setStaffDirectory: (users: User[]) => void;
  updateSpecialization: (userId: string, specialization: string) => void;
  initAuthListener: () => () => void;
}

async function fetchAndMatchProfile(): Promise<{ user: User | null; directory: User[] }> {
  const profiles = await fetchProfiles();
  const session = await getSession();
  const user = session ? profiles.find((p) => p.id === session.user.id) ?? null : null;
  return { user, directory: profiles };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  activeStaffUser: null,
  staffDirectory: [],
  onlineStaffIds: new Set(),
  isLoading: false,
  isRestoring: true,

  setOnlineStaffIds: (ids) => set({ onlineStaffIds: ids }),

  login: async (email, password) => {
    const result = await signInStaff(email, password);
    const profiles = await fetchProfiles();
    const profile = profiles.find((p) => p.id === result.user!.id);
    if (!profile) throw new Error('Akun tidak ditemukan di direktori staf.');
    set({ activeStaffUser: profile, staffDirectory: profiles });
    return profile;
  },

  logout: async () => {
    await signOutStaff();
    set({ activeStaffUser: null });
  },

  restoreSession: async () => {
    try {
      const { user, directory } = await fetchAndMatchProfile();
      set({ activeStaffUser: user, staffDirectory: directory });
    } catch (err) {
      console.error('Failed to restore session:', err);
      set({ isRestoring: false });
      return;
    } finally {
      if (get().isRestoring) set({ isRestoring: false });
    }
  },

  setStaffDirectory: (users) => set({ staffDirectory: users }),

  updateSpecialization: (userId, specialization) => {
    set((state) => ({
      staffDirectory: state.staffDirectory.map((u) =>
        u.id === userId ? { ...u, specialization } : u
      ),
    }));
  },

  initAuthListener: () => {
    const subscription = onAuthStateChange((session) => {
      if (!session) {
        set({ activeStaffUser: null });
      } else {
        fetchAndMatchProfile().then(({ user, directory }) => {
          set({ activeStaffUser: user, staffDirectory: directory });
        }).catch(() => {});
      }
    });
    return () => subscription.unsubscribe();
  },
}));
