import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ZodUser } from '@repo/contracts';

interface AuthState {
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
      logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    },
  ),
);
