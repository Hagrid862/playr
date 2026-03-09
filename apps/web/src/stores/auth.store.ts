import { ZodUser } from '@repo/contracts';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbStorage } from './idb-storage';
import { useLibraryStore } from './library.store';

export interface AuthState {
  accessToken: string | null;
  user: ZodUser | null;
  isAuthenticated: boolean;
  /** Set by persist middleware when IndexedDB rehydration completes. Not persisted. */
  _hasHydrated: boolean;
  setAuth: (user: ZodUser, accessToken: string) => void;
  updateAccessToken: (accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      updateAccessToken: (accessToken) => set({ accessToken }),
      logout: () => {
        set({ user: null, accessToken: null, isAuthenticated: false });
        useLibraryStore.getState().clearLibrary();
      },
    }),
    {
      name: 'auth-storage',
      storage: idbStorage,
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, err) => {
        if (!err) {
          useAuthStore.setState({ _hasHydrated: true });
        } else {
          useAuthStore.setState({ _hasHydrated: true });
        }
      },
    },
  ),
);
