import { ZodArtist } from '@repo/contracts';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LibraryState {
  libraryId: string | null;
  privateAccountId: string | null;
  privateArtists: ZodArtist[];

  setLibraryId: (libraryId: string) => void;
  setPrivateAccountId: (privateAccountId: string) => void;
  setPrivateArtists: (artists: ZodArtist[]) => void;
  clearLibrary: () => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set) => ({
      libraryId: null,
      privateAccountId: null,
      privateArtists: [],
      setLibraryId: (libraryId) => set({ libraryId }),
      setPrivateAccountId: (privateAccountId) => set({ privateAccountId }),
      setPrivateArtists: (privateArtists) => set({ privateArtists }),
      clearLibrary: () => set({ libraryId: null, privateAccountId: null, privateArtists: [] }),
    }),
    {
      name: 'library-storage',
    },
  ),
);
