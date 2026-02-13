import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LibraryState {
  libraryId: string | null;
  privateAccountId: string | null;

  setLibraryId: (libraryId: string) => void;
  setPrivateAccountId: (privateAccountId: string) => void;
  clearLibrary: () => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set) => ({
      libraryId: null,
      privateAccountId: null,
      setLibraryId: (libraryId) => set({ libraryId }),
      setPrivateAccountId: (privateAccountId) => set({ privateAccountId }),
      clearLibrary: () => set({ libraryId: null, privateAccountId: null }),
    }),
    {
      name: 'library-storage',
    },
  ),
);
