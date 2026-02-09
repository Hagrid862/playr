import { ZodUser } from '@repo/contracts';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useLibraryStore } from './library.store';

export interface AuthState {
  accessToken: string | null;
  user: ZodUser | null;
  isAuthenticated: boolean;
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
      setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      updateAccessToken: (accessToken) => set({ accessToken }),
      logout: () => {
        set({ user: null, accessToken: null, isAuthenticated: false });
        useLibraryStore.getState().clearLibrary();
      },
    }),
    {
      name: 'auth-storage',
    },
  ),
);
