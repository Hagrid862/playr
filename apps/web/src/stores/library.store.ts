import { ZodAlbum, ZodArtist } from '@repo/contracts';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LibraryState {
  libraryId: string | null;
  privateAccountId: string | null;
  privateArtists: ZodArtist[];
  privateAlbums: ZodAlbum[];

  setLibraryId: (libraryId: string) => void;
  setPrivateAccountId: (privateAccountId: string) => void;
  setPrivateArtists: (artists: ZodArtist[]) => void;
  setPrivateAlbums: (albums: ZodAlbum[]) => void;
  clearLibrary: () => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set) => ({
      libraryId: null,
      privateAccountId: null,
      privateArtists: [],
      privateAlbums: [],
      setLibraryId: (libraryId) => set({ libraryId }),
      setPrivateAccountId: (privateAccountId) => set({ privateAccountId }),
      setPrivateArtists: (privateArtists) => set({ privateArtists }),
      setPrivateAlbums: (privateAlbums) => set({ privateAlbums }),
      clearLibrary: () =>
        set({ libraryId: null, privateAccountId: null, privateArtists: [], privateAlbums: [] }),
    }),
    {
      name: 'library-storage',
    },
  ),
);
